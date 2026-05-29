import 'server-only'

import {
  getTotalBalanceInBase,
  listAccountsWithBalance,
} from '@/lib/db/queries/accounts'
import { getNetCashFlowForPeriod } from '@/lib/db/queries/savings'
import { listRecurringForUser } from '@/lib/db/queries/recurring'
import type { AnswerBlock, ChartPoint } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

/** Factor para normalizar una frecuencia a su equivalente mensual. */
const MONTHLY_FACTOR: Record<string, number> = {
  daily: 30,
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
}

export const resolveRunway: IntentResolver = async (_slots, ctx) => {
  const today = new Date(`${ctx.todayIso}T00:00:00Z`)
  const from = new Date(today)
  from.setUTCDate(from.getUTCDate() - 29)
  const fromIso = from.toISOString().slice(0, 10)

  const [accounts, flow, rules] = await Promise.all([
    listAccountsWithBalance(ctx.userId),
    getNetCashFlowForPeriod(ctx.userId, fromIso, ctx.todayIso),
    listRecurringForUser(ctx.userId),
  ])

  // Liquidez real: solo cuentas no-crédito, convertidas a base.
  const liquidAccounts = accounts.filter((a) => a.type !== 'credit_card')
  const snap = await getTotalBalanceInBase(ctx.userId, ctx.baseCurrency, liquidAccounts)
  const balance = Number.parseFloat(snap.total)

  const avgDailyExpense = flow.expense / 30

  // Ingreso recurrente esperado, normalizado a diario.
  let monthlyIncome = 0
  for (const r of rules) {
    if (r.active && r.kind === 'income') {
      monthlyIncome += Number.parseFloat(r.amount) * (MONTHLY_FACTOR[r.frequency] ?? 1)
    }
  }
  const avgDailyIncome = monthlyIncome / 30
  const netBurn = avgDailyExpense - avgDailyIncome

  // Si el ingreso recurrente cubre el gasto, el dinero no se agota.
  if (netBurn <= 0) {
    return {
      intro: 'Tu ingreso recurrente cubre el gasto del último mes.',
      blocks: [
        {
          type: 'amount',
          label: 'Liquidez disponible',
          value: money(balance, ctx.baseCurrency),
          currency: ctx.baseCurrency,
          tone: 'positive',
          note: `Gasto ${money(avgDailyExpense, ctx.baseCurrency)}/día · ingreso ${money(avgDailyIncome, ctx.baseCurrency)}/día`,
        },
      ],
    }
  }

  if (avgDailyExpense <= 0) {
    return {
      intro: 'No tengo suficiente gasto reciente para estimar tu runway.',
      blocks: [
        {
          type: 'amount',
          label: 'Liquidez disponible',
          value: money(balance, ctx.baseCurrency),
          currency: ctx.baseCurrency,
        },
      ],
    }
  }

  const days = Math.max(0, Math.floor(balance / netBurn))

  // Sparkline de la caída proyectada del saldo (hasta 90 días de muestra).
  const horizon = Math.min(days, 90)
  const points: ChartPoint[] = []
  const step = Math.max(1, Math.floor(horizon / 12))
  for (let d = 0; d <= horizon; d += step) {
    points.push({ x: String(d), y: Math.max(0, balance - netBurn * d) })
  }

  const blocks: AnswerBlock[] = [
    {
      type: 'amount',
      label: 'Te alcanza para',
      value: `${days} ${days === 1 ? 'día' : 'días'}`,
      currency: ctx.baseCurrency,
      tone: days < 15 ? 'negative' : days < 45 ? 'warning' : 'positive',
      note: `Quema neta ${money(netBurn, ctx.baseCurrency)}/día`,
    },
  ]

  if (points.length > 1) {
    blocks.push({
      type: 'mini-chart',
      kind: 'sparkline',
      points,
      annotation: `Liquidez hoy ${money(balance, ctx.baseCurrency)}`,
    })
  }

  // Consejo: si la liquidez no llega al mes, sugerir un recorte concreto.
  if (days < 30) {
    const targetDailyBurn = balance / 30
    const cutPerWeek = Math.max(0, netBurn - targetDailyBurn) * 7
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
    intro: 'Estimación a ritmo del último mes, contando tu ingreso recurrente.',
    blocks,
  }
}
