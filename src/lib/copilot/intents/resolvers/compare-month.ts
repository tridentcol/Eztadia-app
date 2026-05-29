import 'server-only'

import { getNetCashFlowForPeriod } from '@/lib/db/queries/savings'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 0))
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

export const resolveCompareMonth: IntentResolver = async (_slots, ctx) => {
  const today = new Date(`${ctx.todayIso}T00:00:00Z`)
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()

  const cur = monthRange(y, m)
  const prevM = m - 1
  const prev = monthRange(prevM < 0 ? y - 1 : y, (prevM + 12) % 12)

  const [curFlow, prevFlow] = await Promise.all([
    getNetCashFlowForPeriod(ctx.userId, cur.from, cur.to),
    getNetCashFlowForPeriod(ctx.userId, prev.from, prev.to),
  ])

  const diff = curFlow.expense - prevFlow.expense
  const pct = prevFlow.expense > 0 ? (diff / prevFlow.expense) * 100 : 0
  // En gasto, subir es malo: el tono se invierte respecto al neto.
  const tone = diff > 0 ? 'negative' : diff < 0 ? 'positive' : 'neutral'

  const max = Math.max(curFlow.expense, prevFlow.expense, 1)

  return {
    intro:
      diff === 0
        ? 'Gastaste lo mismo que el mes pasado.'
        : `Este mes gastaste ${money(Math.abs(diff), ctx.baseCurrency)} ${diff > 0 ? 'más' : 'menos'} que el pasado${pct !== 0 ? ` (${pct > 0 ? '+' : ''}${pct.toFixed(0)}%)` : ''}.`,
    blocks: [
      {
        type: 'amount',
        label: 'Diferencia en gasto',
        value: `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${money(Math.abs(diff), ctx.baseCurrency)}`,
        currency: ctx.baseCurrency,
        tone,
      },
      {
        type: 'bars',
        title: 'Gasto mensual',
        max,
        valueFormat: 'money',
        rows: [
          { label: 'Mes pasado', raw: prevFlow.expense, value: money(prevFlow.expense, ctx.baseCurrency) },
          { label: 'Este mes', raw: curFlow.expense, value: money(curFlow.expense, ctx.baseCurrency) },
        ],
      },
    ],
  }
}
