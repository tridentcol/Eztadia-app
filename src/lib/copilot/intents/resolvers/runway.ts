import 'server-only'

import { getTotalBalanceInBase } from '@/lib/db/queries/accounts'
import { getNetCashFlowForPeriod } from '@/lib/db/queries/savings'
import type { AnswerBlock, ChartPoint } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

export const resolveRunway: IntentResolver = async (_slots, ctx) => {
  const today = new Date(`${ctx.todayIso}T00:00:00Z`)
  const from = new Date(today)
  from.setUTCDate(from.getUTCDate() - 29)
  const fromIso = from.toISOString().slice(0, 10)

  const [snap, flow] = await Promise.all([
    getTotalBalanceInBase(ctx.userId, ctx.baseCurrency),
    getNetCashFlowForPeriod(ctx.userId, fromIso, ctx.todayIso),
  ])

  const balance = Number.parseFloat(snap.total)
  const avgDailyExpense = flow.expense / 30

  if (avgDailyExpense <= 0) {
    return {
      intro: 'No tengo suficiente gasto reciente para estimar tu runway.',
      blocks: [
        {
          type: 'amount',
          label: 'Saldo disponible',
          value: money(balance, ctx.baseCurrency),
          currency: ctx.baseCurrency,
        },
      ],
    }
  }

  const days = Math.max(0, Math.floor(balance / avgDailyExpense))

  // Sparkline de la caída proyectada del saldo (hasta 90 días de muestra).
  const horizon = Math.min(days, 90)
  const points: ChartPoint[] = []
  const step = Math.max(1, Math.floor(horizon / 12))
  for (let d = 0; d <= horizon; d += step) {
    points.push({ x: String(d), y: Math.max(0, balance - avgDailyExpense * d) })
  }

  const blocks: AnswerBlock[] = [
    {
      type: 'amount',
      label: 'Te alcanza para',
      value: `${days} ${days === 1 ? 'día' : 'días'}`,
      currency: ctx.baseCurrency,
      tone: days < 15 ? 'negative' : days < 45 ? 'warning' : 'positive',
      note: `Gasto medio ${money(avgDailyExpense, ctx.baseCurrency)}/día`,
    },
  ]

  if (points.length > 1) {
    blocks.push({
      type: 'mini-chart',
      kind: 'sparkline',
      points,
      annotation: `Saldo hoy ${money(balance, ctx.baseCurrency)}`,
    })
  }

  // Consejo: si la liquidez no llega al mes, sugerir un recorte concreto.
  if (days < 30) {
    const targetDaily = balance / 30
    const cutPerWeek = Math.max(0, avgDailyExpense - targetDaily) * 7
    blocks.push({
      type: 'advice',
      tone: days < 15 ? 'negative' : 'warning',
      title: 'Liquidez ajustada',
      body:
        cutPerWeek > 0
          ? `Te alcanza para ~${days} días. Recortando ~${money(cutPerWeek, ctx.baseCurrency)}/semana llegas al mes.`
          : `Te alcanza para ~${days} días. Atento a los próximos pagos antes de gastar de más.`,
    })
  }

  return {
    intro: 'Estimación a ritmo de gasto de los últimos 30 días.',
    blocks,
  }
}
