import type { PeriodSlot } from '../intents/types'

/**
 * IR de consulta componible (v1). Una pregunta de datos se descompone en
 * métrica × sujeto × dimensión × filtros × período × orden × comparación, y un
 * ejecutor/render genéricos la resuelven. PURO (solo tipos).
 */

export type QueryMetric = 'sum' | 'count' | 'avg' | 'max' | 'min'
export type QuerySubject = 'expense' | 'income' | 'net'
export type QueryGroupBy = 'category' | 'merchant' | 'account' | 'month'

export type QueryFilters = {
  categoryId?: string
  categoryName?: string
  merchantSlug?: string
  merchantName?: string
  accountId?: string
  accountName?: string
  minAmount?: number
  maxAmount?: number
}

export type QueryOrder = { by: 'value' | 'date'; dir: 'asc' | 'desc' }

/** Comparación de dos lados: dos entidades de una dimensión, o dos períodos. */
export type CompareSpec =
  | {
      by: 'entities'
      dimension: 'category' | 'merchant'
      a: { filters: QueryFilters; label: string }
      b: { filters: QueryFilters; label: string }
    }
  | {
      by: 'period'
      a: PeriodSlot
      b: PeriodSlot
    }

export type Query = {
  metric: QueryMetric
  subject: QuerySubject
  groupBy?: QueryGroupBy
  filters: QueryFilters
  period: PeriodSlot
  order?: QueryOrder
  limit?: number
  compare?: CompareSpec
}
