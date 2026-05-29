import type { FollowUpChip } from '../render/answer-ast'
import type { IntentId, Slots } from '../intents/types'

/**
 * Sugerencias conversacionales por intent. PURO. Se completa en B8; por ahora
 * devuelve vacío para no adelantar contenido fuera de su fase.
 */
export function buildFollowUps(_intent: IntentId, _slots: Slots): FollowUpChip[] {
  return []
}
