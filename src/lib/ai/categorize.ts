import 'server-only'
import { and, eq, isNotNull, isNull, or, sql } from 'drizzle-orm'
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

/**
 * Umbrales:
 *  - TOP1: si la transacción más parecida supera 0.85, tomamos su categoría
 *    directamente. Atajo común para gastos recurrentes (mismo Uber, misma
 *    nómina).
 *  - KNN_AVG_MIN: el bucket ganador del top-5 debe promediar > 0.60 para
 *    aceptar sin LLM.
 *  - LLM_MIN: el modelo debe reportar >= 0.55 para que aceptemos la sugerencia.
 */
const TOP1_THRESHOLD = 0.85
const KNN_AVG_MIN = 0.6
const LLM_MIN = 0.55
const KNN_LIMIT = 5

export type CategorySuggestion = {
  categoryId: string
  confidence: number
  source: 'knn' | 'llm' | 'top1'
  /** Top-3 alternativas con su confidence — usadas por la UI de override. */
  alternatives: Array<{ categoryId: string; confidence: number }>
  /** Embedding generado (para persistirlo junto al row). null si no aplica. */
  embedding: number[] | null
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

async function llmFallback(
  userId: string,
  description: string,
  merchant: string | null,
  kind: 'income' | 'expense' | 'transfer',
): Promise<{ categoryId: string; confidence: number } | null> {
  const provider = getAnthropic()
  if (!provider) return null
  const eligible = await listEligibleCategories(userId, kind)
  if (eligible.length === 0) return null
  const input = buildEmbeddingInput(description, merchant) ?? description
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
        eligible.map((c) => `${c.id} · ${c.name}`).join('\n'),
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

  const embedding = await embedTransaction(description, merchant)
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
  const provider = getOpenAI()
  if (!provider) return items.map(() => null)

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
      out[idx] = {
        categoryId: '',
        confidence: 0,
        source: 'knn',
        alternatives,
        embedding,
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
