import 'server-only'
import { and, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { embedMany, generateObject } from 'ai'
import { z } from 'zod'

import { db } from '@/lib/db/client'
import { categories, transactions } from '@/lib/db/schema'
import { getAnthropic, CLAUDE_MODEL_ID } from './anthropic'
import { EMBEDDING_MODEL, getOpenAI } from './openai'
import {
  buildEmbeddingInput,
  embedTransaction,
  toPgvectorLiteral,
} from './embed-transaction'
import { findMerchantRule } from '@/lib/heuristic/merchants'

/**
 * Umbrales:
 *  - TOP1: si la transacción más parecida supera 0.85, tomamos su categoría
 *    directamente. Atajo común para gastos recurrentes (mismo Uber, misma
 *    nómina).
 *  - KNN_AVG_MIN: el bucket ganador del top-5 debe promediar > 0.60 para
 *    aceptar sin LLM.
 *  - LLM_MIN: el modelo debe reportar >= 0.55 para que aceptemos la sugerencia.
 *  - MERCHANT_CONFIDENCE: confidence asignada cuando la regla de merchants
 *    matchea. Determinista, así que la fijamos en 0.7 — alta pero no top.
 */
const TOP1_THRESHOLD = 0.85
const KNN_AVG_MIN = 0.6
const LLM_MIN = 0.55
const KNN_LIMIT = 5
const MERCHANT_CONFIDENCE = 0.7

export type CategorySuggestion = {
  categoryId: string
  confidence: number
  source: 'knn' | 'llm' | 'top1' | 'merchant'
  /** Top-3 alternativas con su confidence — usadas por la UI de override. */
  alternatives: Array<{ categoryId: string; confidence: number }>
  /** Embedding generado (para persistirlo junto al row). null si no aplica. */
  embedding: number[] | null
}

/**
 * Busca categoría sistema por nombre exacto. Usado por el fallback de
 * merchants heurísticos.
 */
async function findSystemCategoryId(
  name: string,
  kind: 'income' | 'expense',
): Promise<string | null> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.name, name),
        eq(categories.kind, kind),
        isNull(categories.userId),
        eq(categories.archived, false),
      ),
    )
    .limit(1)
  return row?.id ?? null
}

type KnnRow = { category_id: string; similarity: number }

async function fetchKnn(
  userId: string,
  embedding: number[],
  kind: 'income' | 'expense' | 'transfer',
): Promise<KnnRow[]> {
  const literal = toPgvectorLiteral(embedding)
  const rows = await db.execute<KnnRow>(sql`
    SELECT
      t.category_id,
      1 - (t.embedding <=> ${literal}::vector) AS similarity
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ${userId}
      AND t.deleted_at IS NULL
      AND t.category_id IS NOT NULL
      AND t.embedding IS NOT NULL
      AND t.kind = ${kind}
      AND c.kind = ${kind}
    ORDER BY t.embedding <=> ${literal}::vector
    LIMIT ${KNN_LIMIT}
  `)
  return rows
}

type RankedBucket = {
  categoryId: string
  avg: number
  count: number
  weighted: number
}

function rankBuckets(rows: KnnRow[]): RankedBucket[] {
  const scores = new Map<string, { sumSim: number; count: number }>()
  for (const r of rows) {
    const entry = scores.get(r.category_id) ?? { sumSim: 0, count: 0 }
    entry.sumSim += Number(r.similarity)
    entry.count += 1
    scores.set(r.category_id, entry)
  }
  return [...scores.entries()]
    .map(([categoryId, { sumSim, count }]) => ({
      categoryId,
      avg: sumSim / count,
      count,
      weighted: (sumSim / count) * Math.sqrt(count),
    }))
    .sort((a, b) => b.weighted - a.weighted)
}

async function listEligibleCategories(
  userId: string,
  kind: 'income' | 'expense' | 'transfer',
) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(
      and(
        eq(categories.kind, kind),
        eq(categories.archived, false),
        or(isNull(categories.userId), eq(categories.userId, userId)),
      ),
    )
}

/**
 * Few-shot dinámico: las correcciones EXPLÍCITAS del usuario (transacciones
 * con `user_corrected`) son la señal más fuerte de cómo categoriza. Las
 * inyectamos en el prompt del LLM para que respete sus preferencias. Latencia:
 * un query indexado por (user_id, kind); datos quedan en la DB del usuario.
 */
async function listUserCorrectedExamples(
  userId: string,
  kind: 'income' | 'expense' | 'transfer',
  limit = 8,
): Promise<Array<{ description: string; merchant: string | null; categoryName: string }>> {
  return db
    .select({
      description: transactions.description,
      merchant: transactions.merchant,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.kind, kind),
        eq(transactions.userCorrected, true),
        isNull(transactions.deletedAt),
      ),
    )
    .orderBy(desc(transactions.updatedAt))
    .limit(limit)
}

async function llmFallback(
  userId: string,
  description: string,
  merchant: string | null,
  kind: 'income' | 'expense' | 'transfer',
): Promise<{ categoryId: string; confidence: number } | null> {
  const provider = await getAnthropic({ userId })
  if (!provider) return null
  const eligible = await listEligibleCategories(userId, kind)
  if (eligible.length === 0) return null
  const input = buildEmbeddingInput(description, merchant) ?? description
  const examples = await listUserCorrectedExamples(userId, kind)
  const fewShot =
    examples.length > 0
      ? `\n\nAsí categoriza ESTE usuario (correcciones suyas — respétalas si encaja):\n` +
        examples
          .map(
            (e) =>
              `- "${buildEmbeddingInput(e.description, e.merchant) ?? e.description}" → ${e.categoryName}`,
          )
          .join('\n')
      : ''
  const schema = z.object({
    categoryId: z.string().uuid(),
    confidence: z.number().min(0).max(1),
  })
  try {
    const { object } = await generateObject({
      model: provider(CLAUDE_MODEL_ID),
      schema,
      system:
        'Eres un asistente que clasifica transacciones financieras en español a la categoría más probable. ' +
        'Respondes únicamente con el id exacto de una de las categorías provistas. ' +
        'Si ninguna encaja con confianza, devuelve la más cercana con confidence baja.',
      prompt:
        `Transacción: "${input}"\n\n` +
        `Categorías disponibles (id · nombre):\n` +
        eligible.map((c) => `${c.id} · ${c.name}`).join('\n') +
        fewShot,
    })
    if (!eligible.some((c) => c.id === object.categoryId)) return null
    return { categoryId: object.categoryId, confidence: object.confidence }
  } catch {
    return null
  }
}

/**
 * Pipeline completo de categorización IA.
 *
 *  1. Genera embedding (OpenAI text-embedding-3-small).
 *  2. kNN sobre transactions del mismo usuario y mismo `kind`. Si top-1 ≥ 0.85,
 *     atajo top-1. Si bucket ganador promedia ≥ 0.60, usar ese.
 *  3. Fallback LLM (Claude Sonnet 4.6) con lista de categorías elegibles del
 *     usuario. Aceptar sólo si confidence ≥ 0.55.
 *  4. Si ninguna señal alcanza, devolver null (la transacción queda sin
 *     categoría — el usuario la asignará manual).
 *
 * Para `kind === 'transfer'` retornamos null sin tocar IA: las transferencias
 * no se categorizan.
 */
export async function categorizeTransaction(params: {
  userId: string
  description: string
  merchant: string | null
  kind: 'income' | 'expense' | 'transfer'
}): Promise<CategorySuggestion | null> {
  const { userId, description, merchant, kind } = params
  if (kind === 'transfer') return null

  const embedding = await embedTransaction(description, merchant, { userId })
  if (embedding) {
    const knn = await fetchKnn(userId, embedding, kind)
    if (knn.length > 0) {
      const top1Sim = Number(knn[0]!.similarity)
      const ranked = rankBuckets(knn)
      const winner = ranked[0]!
      const alternatives = ranked
        .slice(0, 3)
        .map((r) => ({ categoryId: r.categoryId, confidence: clamp01(r.avg) }))

      if (top1Sim >= TOP1_THRESHOLD) {
        return {
          categoryId: knn[0]!.category_id,
          confidence: clamp01(top1Sim),
          source: 'top1',
          alternatives,
          embedding,
        }
      }
      if (winner.avg >= KNN_AVG_MIN) {
        return {
          categoryId: winner.categoryId,
          confidence: clamp01(winner.avg),
          source: 'knn',
          alternatives,
          embedding,
        }
      }
    }
  }

  const llm = await llmFallback(userId, description, merchant, kind)
  if (llm && llm.confidence >= LLM_MIN) {
    return {
      categoryId: llm.categoryId,
      confidence: llm.confidence,
      source: 'llm',
      alternatives: [{ categoryId: llm.categoryId, confidence: llm.confidence }],
      embedding,
    }
  }

  // Heurístico final por reglas de merchant (LATAM). Siempre disponible,
  // sin LLM. Aporta cuando el usuario no tiene historia previa y no hay key.
  // kind ya está narrowed a income|expense (el transfer return null arriba).
  const composedText = `${description} ${merchant ?? ''}`.trim()
  const rule = findMerchantRule(composedText, kind)
  if (rule) {
    const categoryId = await findSystemCategoryId(rule.category, rule.kind)
    if (categoryId) {
      return {
        categoryId,
        confidence: MERCHANT_CONFIDENCE,
        source: 'merchant',
        alternatives: [{ categoryId, confidence: MERCHANT_CONFIDENCE }],
        embedding,
      }
    }
  }

  // Sólo persistimos el embedding (sin categoría) para que futuras kNN tengan
  // este punto en el espacio vectorial — útil cuando el usuario lo categorice
  // manualmente.
  return embedding
    ? {
        categoryId: '',
        confidence: 0,
        source: 'knn',
        alternatives: [],
        embedding,
      }
    : null
}

/**
 * Versión batch para imports: embeddings via `embedMany` (un round-trip) y
 * kNN por fila. NO usa LLM fallback (throughput sobre exactitud para grandes
 * imports). Si OpenAI no está configurada, devuelve `Array<null>`.
 */
export async function categorizeBatch(
  userId: string,
  items: Array<{
    description: string
    merchant: string | null
    kind: 'income' | 'expense' | 'transfer'
  }>,
): Promise<Array<CategorySuggestion | null>> {
  if (items.length === 0) return []
  const provider = await getOpenAI({ userId, scope: 'embed' })

  // Si no hay provider (modo heurístico puro), aplicamos sólo merchant rules
  // — rápido y determinista, sin embeddings.
  if (!provider) {
    return Promise.all(
      items.map(async (it) => {
        if (it.kind === 'transfer') return null
        const composed = `${it.description} ${it.merchant ?? ''}`.trim()
        const rule = findMerchantRule(composed, it.kind)
        if (!rule) return null
        const catId = await findSystemCategoryId(rule.category, rule.kind)
        if (!catId) return null
        return {
          categoryId: catId,
          confidence: MERCHANT_CONFIDENCE,
          source: 'merchant' as const,
          alternatives: [{ categoryId: catId, confidence: MERCHANT_CONFIDENCE }],
          embedding: null,
        }
      }),
    )
  }

  const inputs = items.map((it) =>
    it.kind === 'transfer' ? null : buildEmbeddingInput(it.description, it.merchant),
  )
  const validIndices: number[] = []
  const validInputs: string[] = []
  for (let i = 0; i < inputs.length; i++) {
    const v = inputs[i]
    if (v) {
      validIndices.push(i)
      validInputs.push(v)
    }
  }
  if (validInputs.length === 0) return items.map(() => null)

  let embeddings: number[][]
  try {
    const result = await embedMany({
      model: provider.textEmbedding(EMBEDDING_MODEL),
      values: validInputs,
    })
    embeddings = result.embeddings
  } catch {
    return items.map(() => null)
  }

  const out: Array<CategorySuggestion | null> = items.map(() => null)
  for (let j = 0; j < validIndices.length; j++) {
    const idx = validIndices[j]!
    const embedding = embeddings[j]!
    const item = items[idx]!
    if (item.kind === 'transfer') continue
    const knn = await fetchKnn(userId, embedding, item.kind)
    if (knn.length === 0) {
      // Sin vecinos previos — guardamos solo el embedding para futura kNN.
      out[idx] = {
        categoryId: '',
        confidence: 0,
        source: 'knn',
        alternatives: [],
        embedding,
      }
      continue
    }
    const top1Sim = Number(knn[0]!.similarity)
    const ranked = rankBuckets(knn)
    const winner = ranked[0]!
    const alternatives = ranked
      .slice(0, 3)
      .map((r) => ({ categoryId: r.categoryId, confidence: clamp01(r.avg) }))

    if (top1Sim >= TOP1_THRESHOLD) {
      out[idx] = {
        categoryId: knn[0]!.category_id,
        confidence: clamp01(top1Sim),
        source: 'top1',
        alternatives,
        embedding,
      }
    } else if (winner.avg >= KNN_AVG_MIN) {
      out[idx] = {
        categoryId: winner.categoryId,
        confidence: clamp01(winner.avg),
        source: 'knn',
        alternatives,
        embedding,
      }
    } else {
      // kNN no alcanza umbral — probamos merchant rules antes de dejarlo vacío.
      // (item.kind ya está narrowed: el continue de transfer está arriba.)
      const composed = `${item.description} ${item.merchant ?? ''}`.trim()
      const rule = findMerchantRule(composed, item.kind)
      let merchantCatId: string | null = null
      if (rule) {
        merchantCatId = await findSystemCategoryId(rule.category, rule.kind)
      }
      if (merchantCatId) {
        out[idx] = {
          categoryId: merchantCatId,
          confidence: MERCHANT_CONFIDENCE,
          source: 'merchant',
          alternatives: [{ categoryId: merchantCatId, confidence: MERCHANT_CONFIDENCE }],
          embedding,
        }
      } else {
        out[idx] = {
          categoryId: '',
          confidence: 0,
          source: 'knn',
          alternatives,
          embedding,
        }
      }
    }
  }
  return out
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * Re-categorizar transacciones sin categoría y sin user_corrected del usuario.
 * Procesa en chunks de 25 para no saturar el provider.
 */
export async function recategorizeUnclassified(
  userId: string,
  options: { limit?: number } = {},
): Promise<{ processed: number; categorized: number }> {
  const limit = options.limit ?? 100
  const rows = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      merchant: transactions.merchant,
      kind: transactions.kind,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.categoryId),
        eq(transactions.userCorrected, false),
        isNotNull(transactions.kind),
      ),
    )
    .limit(limit)

  let categorized = 0
  for (const row of rows) {
    const suggestion = await categorizeTransaction({
      userId,
      description: row.description,
      merchant: row.merchant,
      kind: row.kind,
    })
    if (!suggestion) continue
    await db
      .update(transactions)
      .set({
        categoryId: suggestion.categoryId || null,
        aiCategorized: !!suggestion.categoryId,
        aiConfidence:
          suggestion.confidence > 0
            ? suggestion.confidence.toFixed(2)
            : null,
        embedding: suggestion.embedding ?? undefined,
      })
      .where(eq(transactions.id, row.id))
    if (suggestion.categoryId) categorized++
  }
  return { processed: rows.length, categorized }
}
