import 'server-only'

import type { Intent } from './types'

/**
 * Normaliza el input del usuario: lowercase, sin acentos, sin signos finales,
 * espacios colapsados. El matcher contra keywords trabaja sobre esta forma.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Encuentra el intent que mejor matchea el input. Score:
 *  +3 si el regex `matcher` da match.
 *  +1 por cada keyword presente.
 *
 * Devuelve null si nadie supera score >= 1. El caller mostrará la lista de
 * sugerencias clickables en ese caso.
 */
export function matchIntent(
  rawText: string,
  intents: Intent[],
): { intent: Intent; score: number } | null {
  const text = normalize(rawText)
  let best: { intent: Intent; score: number } | null = null
  for (const intent of intents) {
    let score = 0
    if (intent.matcher && intent.matcher.test(text)) score += 3
    for (const kw of intent.keywords) {
      const k = normalize(kw)
      if (text.includes(k)) score += 1
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { intent, score }
    }
  }
  return best
}
