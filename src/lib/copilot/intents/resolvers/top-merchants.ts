import 'server-only'

import { listMerchantsForUser, type MerchantsRange } from '@/lib/db/queries/merchants'
import type { BreakdownRow } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money, periodOrThisMonth, capitalize } from '../helpers'

export const resolveTopMerchants: IntentResolver = async (slots, ctx) => {
  const period = periodOrThisMonth(slots, ctx)
  const range: MerchantsRange = {
    scope: 'this-month',
    from: period.from,
    to: period.to,
    label: period.label,
  }

  const merchants = await listMerchantsForUser(ctx.userId, range, { limit: 8 })
  if (merchants.length === 0) {
    return {
      intro: `Sin comercios con gasto ${period.label}.`,
      blocks: [{ type: 'text', body: 'No hay gastos registrados en ese período.' }],
    }
  }

  const total = merchants.reduce((acc, m) => acc + Number.parseFloat(m.totalBase), 0)
  const rows: BreakdownRow[] = merchants.map((m) => ({
    label: m.name,
    value: money(m.totalBase, ctx.baseCurrency),
    fraction: total > 0 ? Number.parseFloat(m.totalBase) / total : 0,
    sub: `${m.count} ${m.count === 1 ? 'compra' : 'compras'}`,
  }))

  return {
    intro: `${capitalize(period.label)}: tus comercios con más gasto.`,
    blocks: [{ type: 'breakdown', title: 'Top comercios', rows }],
  }
}
