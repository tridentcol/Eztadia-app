import 'server-only'

import { sql } from 'drizzle-orm'
import { embed } from 'ai'

import { db } from '@/lib/db/client'
import { getOpenAI, EMBEDDING_MODEL } from '@/lib/ai/openai'
import { toPgvectorLiteral } from '@/lib/ai/embed-transaction'
import type { EngineContext } from '../intents/types'

export type SemanticResult = {
  /** Intents rankeados por similitud agregada. `intent` es el IntentId como string. */
  ranking: Array<{ intent: string; score: number }>
  top: string
  /** Similitud coseno del mejor match (0..1), aproxima la confianza. */
  confidence: number
}

const KNN_LIMIT = 12

/**
 * Clasifica una utterance por SIGNIFICADO: embebe el texto y hace kNN coseno
 * contra `intent_examples`, agregando por intent (máx similitud + bonus leve si
 * varios ejemplos del mismo intent caen en el top). Generaliza a parafraseos
 * que el matcher por keywords no reconoce.
 *
 * Devuelve null si no hay provider OpenAI o si el embedding falla → el engine
 * degrada al classifier por keywords sin romper.
 */
export async function classifySemantic(
  utterance: string,
  ctx: EngineContext,
): Promise<SemanticResult | null> {
  const provider = await getOpenAI({ userId: ctx.userId, scope: 'embed' })
  if (!provider) return null

  let embedding: number[]
  try {
    const res = await embed({
      model: provider.textEmbedding(EMBEDDING_MODEL),
      value: utterance,
    })
    embedding = res.embedding
  } catch (err) {
    console.error('[copilot] embed de utterance falló:', err)
    return null
  }

  const literal = toPgvectorLiteral(embedding)
  const rows = await db.execute<{ intent: string; similarity: number }>(sql`
    SELECT intent, 1 - (embedding <=> ${literal}::vector) AS similarity
    FROM intent_examples
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${KNN_LIMIT}
  `)
  if (rows.length === 0) return null

  const byIntent = new Map<string, { max: number; count: number }>()
  for (const r of rows) {
    const sim = Number(r.similarity)
    const cur = byIntent.get(r.intent)
    if (cur) {
      cur.max = Math.max(cur.max, sim)
      cur.count += 1
    } else {
      byIntent.set(r.intent, { max: sim, count: 1 })
    }
  }

  const ranking = [...byIntent.entries()]
    .map(([intent, v]) => ({ intent, score: v.max + Math.min(v.count - 1, 3) * 0.01 }))
    .sort((a, b) => b.score - a.score)

  const top = ranking[0] as { intent: string; score: number }
  return { ranking, top: top.intent, confidence: Math.min(1, top.score) }
}
