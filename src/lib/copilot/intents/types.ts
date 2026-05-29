import type { AnswerPayload } from '../render/answer-ast'

/**
 * Tipos centrales del motor conversacional. PUROS (sin `server-only`): el
 * classifier y el corpus de tests dependen de este módulo y de `catalog.ts`,
 * que no deben arrastrar acceso a DB. Los resolvers (que sí tocan DB) viven en
 * `intents/resolvers/*` bajo `server-only` y se mapean en `registry.ts`.
 */

export type IntentId =
  | 'show-balance'
  | 'spend-by-category'
  | 'top-merchants'
  | 'budget-status'
  | 'upcoming-payments'
  | 'runway'
  | 'compare-month'
  | 'biggest-charge'
  | 'subscriptions'
  | 'savings-progress'
  | 'debt-overview'
  | 'account-detail'
  | 'insights-active'
  | 'search-transactions'
  | 'monthly-summary'
  | 'dormant-money'
  | 'advice'
  | 'data-query'
  | 'help'

export type SlotKey =
  | 'period'
  | 'category'
  | 'merchant'
  | 'account'
  | 'money'
  | 'ordering'
  | 'query'

export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

export type PeriodSlot = {
  from: string
  to: string
  label: string
  granularity: Granularity
}

export type CategorySlot = {
  id: string
  name: string
}

export type MerchantSlot = {
  slug: string
  name: string
}

export type AccountSlot = {
  id: string
  name: string
  type: string
}

export type MoneySlot = {
  value: number
}

export type OrderingSlot = {
  order: 'asc' | 'desc'
  limit?: number
  sortBy?: 'amount' | 'date'
  /** Filtro de umbral (ej: "mayor a 100k"). */
  threshold?: { op: 'gt' | 'lt'; value: number }
}

/**
 * Slots resueltos para un turno. Los que requieren DB (category/merchant/
 * account) sólo se rellenan en el camino server-side; el classifier puro usa
 * los demás. `categoryCandidates` aparece cuando hay ambigüedad (>=2 cerca).
 */
export type Slots = {
  period?: PeriodSlot
  category?: CategorySlot
  categoryCandidates?: CategorySlot[]
  merchant?: MerchantSlot
  account?: AccountSlot
  money?: MoneySlot
  ordering?: OrderingSlot
  /** Texto libre para búsquedas (ej: lo que sigue a "busca ..."). */
  query?: string
}

/** Metadata clasificable de un intent — pura, sin lógica de resolución. */
export type IntentMeta = {
  id: IntentId
  /** Peso 2 en el scoring; se comparan normalizados. */
  keywords: string[]
  /** Peso 3 por cada match; corren sobre el texto normalizado. */
  patterns: RegExp[]
  /** Peso 2 si el slot está presente. */
  slotsExpected: SlotKey[]
  /** Si falta uno de éstos → clarification. */
  slotsRequired?: SlotKey[]
}

export type EngineContext = {
  userId: string
  baseCurrency: string
  /** ISO YYYY-MM-DD del "hoy" del request. */
  todayIso: string
}

/** Resolver server-side de un intent: dado los slots y el contexto, produce la respuesta. */
export type IntentResolver = (
  slots: Slots,
  ctx: EngineContext,
) => Promise<AnswerPayload>
