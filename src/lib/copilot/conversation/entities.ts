import type { AnswerPayload } from '../render/answer-ast'
import type { IntentId } from '../intents/types'
import type { ReferenceEntity } from './reducer'

/**
 * Extrae las entidades referenciables de una respuesta (para resolver "ese",
 * "el segundo", "ábrelo" en el siguiente turno). PURO. El kind se infiere del
 * intent (el AST no lo lleva por ítem): breakdown de top-merchants → comercios,
 * de gasto por categoría → categorías; listas/timelines → transacciones.
 */
export function extractEntities(intent: IntentId, payload: AnswerPayload): ReferenceEntity[] {
  const out: ReferenceEntity[] = []
  for (const block of payload.blocks) {
    if (block.type === 'breakdown') {
      const kind = intent === 'top-merchants' ? 'merchant' : 'category'
      for (const row of block.rows) out.push({ kind, label: row.label })
    } else if (block.type === 'list') {
      for (const it of block.items) out.push({ kind: 'transaction', label: it.primary, id: it.id })
    } else if (block.type === 'event-list') {
      for (const it of block.items) out.push({ kind: 'transaction', label: it.primary, id: it.id })
    }
  }
  return out.slice(0, 10)
}
