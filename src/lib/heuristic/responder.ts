import 'server-only'

import { matchIntent } from './intent-parser'
import { INTENTS, SUGGESTED_PROMPTS } from './intents'
import type { HeuristicContext, HeuristicResponse } from './types'

/**
 * Ejecuta el intent que mejor matchee el texto y devuelve la respuesta. Si
 * no hay match, devuelve una respuesta con sugerencias clickables.
 *
 * Nunca falla silencioso: siempre devuelve algo que el usuario pueda leer.
 */
export async function runHeuristic(
  text: string,
  ctx: HeuristicContext,
): Promise<HeuristicResponse> {
  const match = matchIntent(text, INTENTS)
  if (match) {
    try {
      const res = await match.intent.run(text, ctx)
      if (res) return res
    } catch (err) {
      console.error('[heuristic] intent falló:', err)
      return {
        text: 'No pude completar la consulta. Intenta más tarde o conecta una key de IA desde /ajustes/integraciones.',
      }
    }
  }
  return {
    text:
      'No entendí del todo. Estas son consultas que puedo resolver sin IA externa:\n\n' +
      SUGGESTED_PROMPTS.map((s) => `- ${s.label}`).join('\n'),
  }
}

export { SUGGESTED_PROMPTS } from './intents'
