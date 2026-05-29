import 'server-only'

import { runEngine, runEngineFromHistory, type EngineResult } from './engine'
import type { ConversationContext } from './conversation/reducer'
import type { EngineContext } from './intents/types'

/** Confianza mínima del motor local para responder sin deferir al LLM. */
const LOCAL_MIN = 0.45

export type Routed = {
  mode: 'local' | 'defer'
  result: EngineResult
}

/**
 * Ruteo local-first: corre el motor local y decide si su respuesta es lo
 * bastante confiada para usarse, o si conviene deferir (al LLM si hay key, o
 * al fallback de recuperación si no). Confiado = no cayó en `help` y la
 * confianza supera el umbral, o fue una continuación elíptica intencional.
 */
export async function routeLocal(
  utterances: string[],
  ctx: EngineContext,
  context?: ConversationContext,
): Promise<Routed> {
  // Si el cliente envió el contexto, usamos el último turno + ese contexto
  // (continuidad real, sin reconstruir). Si no, reconstruimos del historial.
  const result = context
    ? await runEngine(utterances[utterances.length - 1] ?? '', ctx, context)
    : await runEngineFromHistory(utterances, ctx)
  const confident =
    result.resolvedIntent !== 'help' &&
    (result.viaEllipsis || result.classification.confidence >= LOCAL_MIN)
  return { mode: confident ? 'local' : 'defer', result }
}
