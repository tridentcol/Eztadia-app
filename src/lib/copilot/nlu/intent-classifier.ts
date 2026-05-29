import type { IntentMeta, IntentId, SlotKey } from '../intents/types'
import { normalize, singularize } from './normalize'
import { similarity } from './levenshtein'
import type { Tokens } from './tokenize'

/**
 * Scoring multi-feature del classifier. PURO.
 *
 *   +3  por cada pattern (regex) que matchee el texto normalizado
 *   +2  por cada keyword exacta presente
 *   +1  por cada keyword fuzzy (Levenshtein > 0.8)
 *   +2  por cada slot esperado presente en el turno
 *
 * confidence = min(1, score / SATURATION). SATURATION calibrado para que un
 * pattern solo (3) supere 0.6 y dos features (≥4) lleguen a "ejecutar".
 */
const SATURATION = 4

export type ClassifierDecision =
  | 'execute'
  | 'clarify-slot'
  | 'clarify-intent'
  | 'fallback'

export type ClassifierResult = {
  intent: IntentId
  confidence: number
  score: number
  decision: ClassifierDecision
  /** Slot requerido ausente (cuando decision === 'clarify-slot'). */
  missingSlot?: SlotKey
  /** Segundo candidato (cuando decision === 'clarify-intent'). */
  alternative?: IntentId
  /** Ranking completo para telemetría. */
  ranking: Array<{ intent: IntentId; score: number; confidence: number }>
}

function scoreIntent(
  meta: IntentMeta,
  tokens: Tokens,
  presentSlots: ReadonlySet<SlotKey>,
): number {
  let score = 0

  for (const re of meta.patterns) {
    if (re.test(tokens.text)) score += 3
  }

  for (const kw of meta.keywords) {
    const k = normalize(kw)
    if (tokens.text.includes(k)) {
      score += 2
      continue
    }
    // fuzzy sólo para keywords de una palabra
    if (!k.includes(' ')) {
      const stem = singularize(k)
      const hit = tokens.stems.some((s) => similarity(stem, s) > 0.8) ||
        tokens.words.some((w) => similarity(k, w) > 0.8)
      if (hit) score += 1
    }
  }

  for (const slot of meta.slotsExpected) {
    if (presentSlots.has(slot)) score += 2
  }

  return score
}

/**
 * Clasifica una utterance tokenizada contra el catálogo. `presentSlots` son
 * los slots ya extraídos para este turno (period, money, category, etc.).
 */
export function classify(
  tokens: Tokens,
  presentSlots: ReadonlySet<SlotKey>,
  catalog: IntentMeta[],
): ClassifierResult {
  const ranking = catalog
    .map((meta) => {
      const score = scoreIntent(meta, tokens, presentSlots)
      return { intent: meta.id, score, confidence: Math.min(1, score / SATURATION) }
    })
    .sort((a, b) => b.score - a.score)

  const top = ranking[0] as { intent: IntentId; score: number; confidence: number }
  const second = ranking[1]

  // Sin señal alguna → fallback a help.
  if (top.score === 0) {
    return { intent: 'help', confidence: 0, score: 0, decision: 'fallback', ranking }
  }

  const topMeta = catalog.find((m) => m.id === top.intent) as IntentMeta

  // Alta confianza → ejecutar (validando slots requeridos).
  if (top.confidence > 0.6) {
    const missing = (topMeta.slotsRequired ?? []).find((s) => !presentSlots.has(s))
    if (missing) {
      return {
        intent: top.intent,
        confidence: top.confidence,
        score: top.score,
        decision: 'clarify-slot',
        missingSlot: missing,
        ranking,
      }
    }
    return {
      intent: top.intent,
      confidence: top.confidence,
      score: top.score,
      decision: 'execute',
      ranking,
    }
  }

  // Zona media (0.4, 0.6] → pedir aclaración.
  if (top.confidence > 0.4) {
    const missing = (topMeta.slotsRequired ?? []).find((s) => !presentSlots.has(s))
    if (missing) {
      return {
        intent: top.intent,
        confidence: top.confidence,
        score: top.score,
        decision: 'clarify-slot',
        missingSlot: missing,
        ranking,
      }
    }
    if (second && top.confidence - second.confidence < 0.1 && second.score > 0) {
      return {
        intent: top.intent,
        confidence: top.confidence,
        score: top.score,
        decision: 'clarify-intent',
        alternative: second.intent,
        ranking,
      }
    }
    // Sin ambigüedad clara: ejecutamos igual — mejor responder que trabar.
    return {
      intent: top.intent,
      confidence: top.confidence,
      score: top.score,
      decision: 'execute',
      ranking,
    }
  }

  return { intent: 'help', confidence: top.confidence, score: top.score, decision: 'fallback', ranking }
}
