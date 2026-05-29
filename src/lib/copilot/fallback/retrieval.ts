import 'server-only'

import { sql } from 'drizzle-orm'
import { embed } from 'ai'

import { db } from '@/lib/db/client'
import { getOpenAI, EMBEDDING_MODEL } from '@/lib/ai/openai'
import { toPgvectorLiteral } from '@/lib/ai/embed-transaction'
import type { AnswerPayload, FollowUpChip, ListItem } from '../render/answer-ast'
import type { EngineContext } from '../intents/types'
import { money } from '../intents/helpers'

const SUGGESTIONS: FollowUpChip[] = [
  { label: 'Mi saldo', utterance: 'cuál es mi saldo total' },
  { label: '¿En qué gasté?', utterance: 'en qué gasté este mes' },
  { label: '¿Qué me recomendás?', utterance: 'qué me recomiendas' },
]

function honest(): AnswerPayload {
  return {
    intro: 'No estoy seguro de entender eso.',
    blocks: [
      {
        type: 'text',
        body: 'Puedo ayudarte con saldos, gastos, presupuestos, pagos próximos y consejos. Probá con una de estas:',
      },
    ],
    followUps: SUGGESTIONS,
  }
}

/**
 * Fallback que no muere: cuando ni el motor local ni el LLM responden, embebe
 * la utterance y trae los movimientos más parecidos del usuario (kNN sobre
 * transactions.embedding) con un mensaje honesto. Si no hay embeddings o no
 * matchea nada, cae a un mensaje de ayuda con sugerencias.
 */
export async function retrievalFallback(
  utterance: string,
  ctx: EngineContext,
): Promise<AnswerPayload> {
  const provider = await getOpenAI({ userId: ctx.userId, scope: 'embed' })
  if (!provider) return honest()

  let embedding: number[]
  try {
    const res = await embed({ model: provider.textEmbedding(EMBEDDING_MODEL), value: utterance })
    embedding = res.embedding
  } catch (err) {
    console.error('[copilot] embed fallback falló:', err)
    return honest()
  }

  const literal = toPgvectorLiteral(embedding)
  const rows = await db.execute<{
    id: string
    date: string
    description: string
    merchant: string | null
    amount_original: string
    currency: string
  }>(sql`
    SELECT t.id, t.date, t.description, t.merchant, t.amount_original, t.currency
    FROM transactions t
    WHERE t.user_id = ${ctx.userId}
      AND t.deleted_at IS NULL
      AND t.embedding IS NOT NULL
    ORDER BY t.embedding <=> ${literal}::vector
    LIMIT 6
  `)

  if (rows.length === 0) return honest()

  const items: ListItem[] = rows.map((r) => ({
    id: r.id,
    primary: r.merchant ?? r.description,
    secondary: r.date,
    trailing: money(r.amount_original, r.currency),
  }))

  return {
    intro: 'No estoy seguro de entenderte, pero esto es lo más parecido en tus movimientos:',
    blocks: [{ type: 'list', items }],
    followUps: SUGGESTIONS,
  }
}
