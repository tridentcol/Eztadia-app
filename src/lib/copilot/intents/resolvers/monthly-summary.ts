import 'server-only'

import { getNetCashFlowForPeriod } from '@/lib/db/queries/savings'
import { listTransactionsForUser } from '@/lib/db/queries/transactions'
import { listBudgetsWithProgress } from '@/lib/db/queries/budgets'
import { listUnreadInsights } from '@/lib/db/queries/insights'
import type { AnswerBlock, BreakdownRow } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money, periodOrThisMonth, capitalize, toneForNet } from '../helpers'

export const resolveMonthlySummary: IntentResolver = async (slots, ctx) => {
  const period = periodOrThisMonth(slots, ctx)

  const [flow, txs, budgets, insights] = await Promise.all([
    getNetCashFlowForPeriod(ctx.userId, period.from, period.to),
    listTransactionsForUser(ctx.userId, {
      kind: 'expense',
      from: period.from,
      to: period.to,
      limit: 500,
    }),
    listBudgetsWithProgress(ctx.userId),
    listUnreadInsights(ctx.userId, 3),
  ])

  if (flow.income === 0 && flow.expense === 0) {
    return {
      intro: `Sin movimientos ${period.label}.`,
      blocks: [{ type: 'text', body: 'No hay nada registrado en ese período todavía.' }],
    }
  }

  const blocks: AnswerBlock[] = [
    {
      type: 'amount',
      label: `Flujo neto · ${period.label}`,
      value: `${flow.net >= 0 ? '+' : '−'}${money(Math.abs(flow.net), ctx.baseCurrency)}`,
      currency: ctx.baseCurrency,
      tone: toneForNet(flow.net),
      note: `Ingresos ${money(flow.income, ctx.baseCurrency)} · Gastos ${money(flow.expense, ctx.baseCurrency)}`,
    },
  ]

  // Top categorías de gasto.
  const byCat = new Map<string, number>()
  for (const t of txs) {
    const key = t.category?.name ?? 'Sin categoría'
    byCat.set(key, (byCat.get(key) ?? 0) + Number.parseFloat(t.amountBase))
  }
  const rows: BreakdownRow[] = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({
      label: name,
      value: money(value, ctx.baseCurrency),
      fraction: flow.expense > 0 ? value / flow.expense : 0,
    }))
  if (rows.length > 0) {
    blocks.push({ type: 'breakdown', title: 'En qué se fue', rows })
  }

  const atRisk = budgets.filter((b) => b.status !== 'safe')
  if (atRisk.length > 0) {
    blocks.push({
      type: 'list',
      title: 'Presupuestos en riesgo',
      items: atRisk.slice(0, 3).map((b) => ({
        id: b.id,
        primary: b.categoryName,
        secondary: `${Math.round(b.percent * 100)}% usado`,
        trailing: money(b.spent, ctx.baseCurrency),
        trailingTone: b.status === 'exceeded' ? 'negative' : 'warning',
      })),
    })
  }

  if (insights.length > 0) {
    blocks.push({
      type: 'list',
      title: 'Lecturas',
      items: insights.map((i) => ({ id: i.id, primary: i.title, secondary: i.body })),
    })
  }

  return { intro: `${capitalize(period.label)} en un vistazo.`, blocks }
}
