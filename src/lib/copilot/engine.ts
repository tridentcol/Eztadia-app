import 'server-only'

import type { AnswerPayload } from './render/answer-ast'
import type { EngineContext, SlotKey, Slots } from './intents/types'
import { INTENT_CATALOG } from './intents/catalog'
import { RESOLVERS } from './intents/registry'
import { tokenize } from './nlu/tokenize'
import { classify, type ClassifierResult } from './nlu/intent-classifier'
import { extractPeriod } from './nlu/slots/period'
import { extractMoney } from './nlu/slots/money'
import { extractOrdering } from './nlu/slots/ordering'
import { extractQuery } from './nlu/slots/query'
import { extractCategory } from './nlu/slots/category'
import { extractAccount } from './nlu/slots/account'
import { extractMerchant } from './nlu/slots/merchant'
import {
  resolveTurn,
  pushTurn,
  type ConversationContext,
} from './conversation/reducer'
import { buildFollowUps } from './conversation/follow-ups'

export type EngineResult = {
  payload: AnswerPayload
  nextContext: ConversationContext
  /** Telemetría: clasificación cruda del turno (sin elipsis aplicada). */
  classification: ClassifierResult
  /** Intent finalmente ejecutado (puede diferir si hubo elipsis). */
  resolvedIntent: string
  viaEllipsis: boolean
}

function presentKeys(slots: Slots): Set<SlotKey> {
  const set = new Set<SlotKey>()
  if (slots.period) set.add('period')
  if (slots.category) set.add('category')
  if (slots.merchant) set.add('merchant')
  if (slots.account) set.add('account')
  if (slots.money) set.add('money')
  if (slots.ordering) set.add('ordering')
  if (slots.query) set.add('query')
  return set
}

/**
 * Punto de entrada del motor heurístico. Tokeniza, extrae slots, clasifica,
 * resuelve elipsis con el contexto, despacha al resolver y adjunta follow-ups.
 * Nunca lanza: ante un fallo del resolver devuelve un mensaje legible.
 */
export async function runEngine(
  message: string,
  ctx: EngineContext,
  context: ConversationContext,
): Promise<EngineResult> {
  const tokens = tokenize(message)

  // --- Slots: puros + categoría/cuenta (queries baratas). ---
  const slots: Slots = {}
  const period = extractPeriod(message, ctx.todayIso)
  if (period) slots.period = period
  const moneySlot = extractMoney(message)
  if (moneySlot) slots.money = moneySlot
  const ordering = extractOrdering(message)
  if (ordering) slots.ordering = ordering
  const query = extractQuery(message)
  if (query) slots.query = query

  const [catRes, account] = await Promise.all([
    extractCategory(message, ctx.userId),
    extractAccount(message, ctx.userId),
  ])
  if (catRes?.match) slots.category = catRes.match
  if (catRes?.candidates) slots.categoryCandidates = catRes.candidates
  if (account) slots.account = account

  // --- Clasificación inicial. ---
  let classification = classify(tokens, presentKeys(slots), INTENT_CATALOG)

  // Merchant es caro (carga histórico): sólo si el turno apunta a búsqueda.
  if (classification.intent === 'search-transactions' && !slots.merchant) {
    const merchant = await extractMerchant(message, ctx.userId, ctx.todayIso)
    if (merchant) {
      slots.merchant = merchant
      classification = classify(tokens, presentKeys(slots), INTENT_CATALOG)
    }
  }

  // --- Elipsis / continuación. ---
  const resolved = resolveTurn({
    tokens,
    slots,
    presentSlots: presentKeys(slots),
    classification,
    context,
  })

  const payload = await dispatch(resolved.intent, resolved.slots, resolved.decision, ctx, {
    missingSlot: resolved.missingSlot,
    alternative: resolved.alternative,
  })

  // Follow-ups según el intent ejecutado (omitidos en clarificaciones).
  if (resolved.decision === 'execute' && !payload.followUps) {
    const followUps = buildFollowUps(resolved.intent, resolved.slots)
    if (followUps.length > 0) payload.followUps = followUps
  }

  const nextContext = pushTurn(context, {
    utterance: message,
    intent: resolved.intent,
    slots: resolved.slots,
  })

  return {
    payload,
    nextContext,
    classification,
    resolvedIntent: resolved.intent,
    viaEllipsis: resolved.viaEllipsis,
  }
}

async function dispatch(
  intent: EngineResult['resolvedIntent'],
  slots: Slots,
  decision: ReturnType<typeof resolveTurn>['decision'],
  ctx: EngineContext,
  extra: { missingSlot?: SlotKey; alternative?: string },
): Promise<AnswerPayload> {
  // Categoría ambigua → preguntar cuál.
  if (slots.categoryCandidates && slots.categoryCandidates.length >= 2) {
    const [a, b] = slots.categoryCandidates
    return {
      intro: '¿A cuál categoría te refieres?',
      blocks: [{ type: 'text', body: 'Hay dos que encajan.' }],
      followUps: [
        { label: a!.name, utterance: `gasto en ${a!.name}` },
        { label: b!.name, utterance: `gasto en ${b!.name}` },
      ],
    }
  }

  if (decision === 'clarify-slot' && extra.missingSlot === 'account') {
    return {
      intro: '¿De cuál cuenta?',
      blocks: [{ type: 'text', body: 'Dime el nombre de la cuenta o "mi débito", "mi tarjeta".' }],
    }
  }

  if (decision === 'clarify-intent' && extra.alternative) {
    return {
      intro: 'Puedo entenderlo de dos formas.',
      blocks: [{ type: 'text', body: '¿Cuál buscas?' }],
      followUps: hintFor(intent).concat(hintFor(extra.alternative)),
    }
  }

  try {
    const resolver = RESOLVERS[intent as keyof typeof RESOLVERS] ?? RESOLVERS.help
    return await resolver(slots, ctx)
  } catch (err) {
    console.error('[copilot] resolver falló:', intent, err)
    return {
      intro: 'No pude completar la consulta.',
      blocks: [{ type: 'text', body: 'Intenta de nuevo en un momento.' }],
    }
  }
}

/** Chip sugerido representativo de un intent (para clarify-intent). */
function hintFor(intent: string): Array<{ label: string; utterance: string }> {
  const map: Record<string, { label: string; utterance: string }> = {
    'show-balance': { label: 'Mi saldo', utterance: 'cuál es mi saldo' },
    'spend-by-category': { label: 'En qué gasté', utterance: 'en qué gasté este mes' },
    'monthly-summary': { label: 'Resumen del mes', utterance: 'resumen del mes' },
    'budget-status': { label: 'Presupuestos', utterance: 'cómo van mis presupuestos' },
  }
  const hit = map[intent]
  return hit ? [hit] : []
}
