import type { IntentId, SlotKey, Slots } from '../intents/types'
import type { ClassifierDecision, ClassifierResult } from '../nlu/intent-classifier'
import type { Tokens } from '../nlu/tokenize'

/**
 * Estado conversacional multi-turno. Efímero: vive en el dialog del copiloto
 * y se serializa hacia el server en cada turno para resolver elipsis. No toca
 * la tabla `messages`. PURO.
 */
export type TurnRecord = {
  utterance: string
  intent: IntentId
  slots: Slots
}

/** Entidad referenciable surgida de la última respuesta ("ese", "el segundo"). */
export type ReferenceEntity = {
  kind: 'transaction' | 'merchant' | 'category' | 'account'
  label: string
  id?: string
}

export type ConversationContext = {
  lastIntent: IntentId | null
  lastSlots: Slots
  /** Máximo 5 turnos, más reciente al final. */
  turnHistory: TurnRecord[]
  /** Entidades de la última respuesta, en orden de aparición (máx 10). */
  lastEntities: ReferenceEntity[]
  /** Intent que quedó esperando un slot (para retomarlo en el próximo turno). */
  pendingIntent?: IntentId
}

export const EMPTY_CONTEXT: ConversationContext = {
  lastIntent: null,
  lastSlots: {},
  turnHistory: [],
  lastEntities: [],
}

const CONNECTOR_RE =
  /^(y|ademas|tambien|ahora|entonces|ok|dale|que tal|y que|y de|y ahora|y que pasa con)\b/

const SLOT_ONLY_KEYS: SlotKey[] = ['period', 'category', 'merchant', 'account', 'money']

/**
 * Redirección de dimensión en un follow-up: una frase de cambio de eje remapea
 * la continuación a otro intent, heredando los slots del turno previo. Solo usa
 * `lastIntent`/`lastSlots` (no requiere la respuesta anterior). Devuelve el
 * intent destino o null si la utterance no pide cambio de dimensión.
 */
function redirectIntent(
  text: string,
  lastIntent: IntentId,
  presentSlots: ReadonlySet<SlotKey>,
): IntentId | null {
  if (/\bpor categoria/.test(text) || /\ben que se (va|me va)\b/.test(text)) {
    return 'spend-by-category'
  }
  if (/\bpor (comercio|tienda)/.test(text) || /\bdonde (mas )?gaste\b/.test(text)) {
    return 'top-merchants'
  }
  if (/\bcomparad|vs (el )?mes pasado|\bcompara\b/.test(text)) {
    return 'compare-month'
  }
  if (
    presentSlots.has('account') &&
    (lastIntent === 'show-balance' || lastIntent === 'account-detail')
  ) {
    return 'account-detail'
  }
  return null
}

export type ResolvedTurn = {
  intent: IntentId
  slots: Slots
  decision: ClassifierDecision
  /** True si se interpretó como continuación elíptica del turno previo. */
  viaEllipsis: boolean
  missingSlot?: SlotKey
  alternative?: IntentId
}

/** Señales de referencia: cues de apertura, ordinales, o "ese/esa <entidad>". */
const REF_OPEN = /\b(abrelo|abrila|abrir|ver detalle|abre (el|la|eso))\b/
const REF_ORDINAL = /\b(el|la) (primer|segund|tercer|cuart|ultim)/
const REF_DEMONSTRATIVE = /\b(ese|esa) (comercio|tienda|negocio|movimiento|gasto|pago|categoria|cuenta)\b/
const REF_BARE = /^(ese|esa|eso)$/

/**
 * Resuelve una referencia ("ábrelo", "el segundo", "ese comercio") contra las
 * entidades de la última respuesta → busca esa entidad (search-transactions por
 * su etiqueta). PURO. Gate estricto para no confundir "ese mes" con referencia.
 */
function resolveReference(text: string, context: ConversationContext): ResolvedTurn | null {
  const ents = context.lastEntities
  if (!ents || ents.length === 0) return null

  const isRef =
    REF_OPEN.test(text) ||
    REF_ORDINAL.test(text) ||
    REF_DEMONSTRATIVE.test(text) ||
    REF_BARE.test(text)
  if (!isRef) return null

  let pool = ents
  if (/\b(comercio|tienda|negocio)\b/.test(text)) pool = ents.filter((e) => e.kind === 'merchant')
  else if (/\bcategoria\b/.test(text)) pool = ents.filter((e) => e.kind === 'category')
  if (pool.length === 0) pool = ents

  let idx = 0
  if (/\bsegund/.test(text)) idx = 1
  else if (/\btercer/.test(text)) idx = 2
  else if (/\bcuart/.test(text)) idx = 3
  else if (/\bultim/.test(text)) idx = pool.length - 1

  const entity = pool[idx] ?? pool[0]
  if (!entity) return null

  return {
    intent: 'search-transactions',
    slots: { query: entity.label },
    decision: 'execute',
    viaEllipsis: true,
  }
}

/**
 * Aplica el contexto a la clasificación cruda. Si el classifier no encontró
 * señal fuerte (fallback o confidence ≤0.4) pero hay un intent previo y la
 * utterance trae un slot reconocible o arranca con un conector ("y la semana
 * pasada", "¿y por mes pasado?"), se interpreta como continuación: se reusa
 * `lastIntent` y se fusionan los slots (los nuevos pisan a los viejos).
 */
export function resolveTurn(params: {
  tokens: Tokens
  slots: Slots
  presentSlots: ReadonlySet<SlotKey>
  classification: ClassifierResult
  context: ConversationContext
}): ResolvedTurn {
  const { tokens, slots, presentSlots, classification, context } = params

  // Referencia a la respuesta anterior ("ese", "el segundo", "ábrelo").
  const reference = resolveReference(tokens.text, context)
  if (reference) return reference

  const startsWithConnector = CONNECTOR_RE.test(tokens.text)
  const hasSlot = SLOT_ONLY_KEYS.some((k) => presentSlots.has(k))
  const weak =
    classification.decision === 'fallback' || classification.confidence <= 0.4

  // Retomar un intent que quedó esperando un slot: si el usuario responde la
  // aclaración (turno débil que aporta un slot), reanudamos ese intent.
  if (context.pendingIntent && weak && hasSlot) {
    return {
      intent: context.pendingIntent,
      slots: mergeSlots(context.lastSlots, slots),
      decision: 'execute',
      viaEllipsis: true,
    }
  }

  // Es un follow-up del hilo si arranca con conector o si la señal es débil
  // pero trae un slot reconocible. En ambos casos heredamos los slots previos.
  const isFollowUp =
    context.lastIntent !== null && (startsWithConnector || (weak && hasSlot))

  if (isFollowUp && context.lastIntent) {
    const redirect = redirectIntent(tokens.text, context.lastIntent, presentSlots)
    // Destino: redirección explícita > intent fuerte recién clasificado (ej.
    // "y comparado" → compare-month) > reuse del intent previo (elipsis pura).
    const intent = redirect ?? (weak ? context.lastIntent : classification.intent)
    return {
      intent,
      slots: mergeSlots(context.lastSlots, slots),
      decision: 'execute',
      viaEllipsis: true,
    }
  }

  return {
    intent: classification.intent,
    slots,
    decision: classification.decision,
    viaEllipsis: false,
    missingSlot: classification.missingSlot,
    alternative: classification.alternative,
  }
}

/** Nuevos slots pisan a los previos; se conservan los que el turno nuevo no trae. */
export function mergeSlots(prev: Slots, next: Slots): Slots {
  return {
    period: next.period ?? prev.period,
    category: next.category ?? prev.category,
    categoryCandidates: next.categoryCandidates ?? undefined,
    merchant: next.merchant ?? prev.merchant,
    account: next.account ?? prev.account,
    money: next.money ?? prev.money,
    ordering: next.ordering ?? prev.ordering,
    query: next.query ?? prev.query,
  }
}

/** Registra el turno resuelto en el contexto, conservando los últimos 5. */
export function pushTurn(
  context: ConversationContext,
  record: TurnRecord,
  options: { entities?: ReferenceEntity[]; pendingIntent?: IntentId } = {},
): ConversationContext {
  const turnHistory = [...context.turnHistory, record].slice(-5)
  return {
    lastIntent: record.intent,
    lastSlots: record.slots,
    turnHistory,
    lastEntities: options.entities ?? [],
    pendingIntent: options.pendingIntent,
  }
}
