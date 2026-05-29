import { normalize } from '../nlu/normalize'
import type { PeriodSlot, Slots } from '../intents/types'
import type { Query, QueryFilters, QueryGroupBy, QueryMetric, QuerySubject } from './types'

/**
 * Construye un `Query` desde el texto + los slots ya extraídos por el engine.
 * PURO (no toca DB; los slots de categoría/comercio/cuenta llegan resueltos).
 * Devuelve null si la utterance no tiene ninguna señal de consulta (para que el
 * caller caiga al intent normal).
 */
export function parseQuery(text: string, slots: Slots, period: PeriodSlot): Query | null {
  const n = normalize(text)

  // --- Métrica ---
  let metric: QueryMetric = 'sum'
  let hasMetricWord = false
  if (/\b(cuant[oa]s|numero de|cantidad de|cuantas (transacciones|compras|veces))\b/.test(n)) {
    metric = 'count'
    hasMetricWord = true
  } else if (/\b(promedio|en promedio|media de)\b/.test(n)) {
    metric = 'avg'
    hasMetricWord = true
  } else if (/\b(maximo|mas alto)\b/.test(n)) {
    metric = 'max'
    hasMetricWord = true
  } else if (/\b(minimo|mas bajo)\b/.test(n)) {
    metric = 'min'
    hasMetricWord = true
  }

  // --- Sujeto ---
  let subject: QuerySubject = 'expense'
  if (/\b(ingres|gane|recibi|me entro|cuanto gane)\b/.test(n)) subject = 'income'
  else if (/\b(neto|flujo|cuanto me quedo|cuanto ahorre)\b/.test(n)) subject = 'net'

  // --- Agrupación ---
  let groupBy: QueryGroupBy | undefined
  if (/\bpor categoria/.test(n)) groupBy = 'category'
  else if (/\bpor (comercio|tienda|negocio)/.test(n)) groupBy = 'merchant'
  else if (/\bpor cuenta/.test(n)) groupBy = 'account'
  else if (/\b(por mes|mensual|cada mes|mes a mes)\b/.test(n)) groupBy = 'month'

  // --- Filtros desde slots ---
  const filters: QueryFilters = {}
  if (slots.category) {
    filters.categoryId = slots.category.id
    filters.categoryName = slots.category.name
  }
  if (slots.merchant) {
    filters.merchantSlug = slots.merchant.slug
    filters.merchantName = slots.merchant.name
  }
  if (slots.account) {
    filters.accountId = slots.account.id
    filters.accountName = slots.account.name
  }
  if (slots.ordering?.threshold) {
    if (slots.ordering.threshold.op === 'gt') filters.minAmount = slots.ordering.threshold.value
    else filters.maxAmount = slots.ordering.threshold.value
  }

  const hasFilter =
    filters.categoryId !== undefined ||
    filters.merchantSlug !== undefined ||
    filters.accountId !== undefined ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined

  // Señal mínima: sin métrica explícita, ni agrupación, ni sujeto no-default, ni
  // filtro → no es una consulta componible; que el caller use el intent normal.
  if (!hasMetricWord && !groupBy && subject === 'expense' && !hasFilter) {
    return null
  }

  const query: Query = { metric, subject, groupBy, filters, period }

  if (slots.ordering) {
    query.order = {
      by: 'value',
      dir: slots.ordering.order,
    }
    if (slots.ordering.limit) query.limit = slots.ordering.limit
  }

  return query
}
