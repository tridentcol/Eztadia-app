import 'server-only'

import { listTransactionsForUser } from '@/lib/db/queries/transactions'
import type { AnswerBlock, BreakdownRow } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money, periodOrThisMonth, capitalize } from '../helpers'

export const resolveSpendByCategory: IntentResolver = async (slots, ctx) => {
  const period = periodOrThisMonth(slots, ctx)

  const txs = await listTransactionsForUser(ctx.userId, {
    kind: 'expense',
    from: period.from,
    to: period.to,
    categoryId: slots.category?.id,
    limit: 500,
  })

  if (txs.length === 0) {
    return {
      intro: `Sin gastos ${period.label}${slots.category ? ` en ${slots.category.name}` : ''}.`,
      blocks: [{ type: 'text', body: 'No hay movimientos de gasto en ese período.' }],
    }
  }

  const total = txs.reduce((acc, t) => acc + Number.parseFloat(t.amountBase), 0)

  // Caso categoría puntual: hero + top movimientos.
  if (slots.category) {
    const top = [...txs]
      .sort((a, b) => Number.parseFloat(b.amountBase) - Number.parseFloat(a.amountBase))
      .slice(0, 5)
    const blocks: AnswerBlock[] = [
      {
        type: 'amount',
        label: `${slots.category.name} · ${period.label}`,
        value: money(total, ctx.baseCurrency),
        currency: ctx.baseCurrency,
        tone: 'neutral',
      },
      {
        type: 'list',
        title: 'Mayores movimientos',
        items: top.map((t) => ({
          id: t.id,
          primary: t.merchant ?? t.description,
          secondary: t.date,
          trailing: money(t.amountBase, ctx.baseCurrency),
        })),
      },
    ]
    return { intro: `Gastaste ${money(total, ctx.baseCurrency)} en ${slots.category.name}.`, blocks }
  }

  // Caso agregado por categoría.
  const byCat = new Map<string, number>()
  for (const t of txs) {
    const key = t.category?.name ?? 'Sin categoría'
    byCat.set(key, (byCat.get(key) ?? 0) + Number.parseFloat(t.amountBase))
  }
  const rows: BreakdownRow[] = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({
      label: name,
      value: money(value, ctx.baseCurrency),
      fraction: total > 0 ? value / total : 0,
    }))

  return {
    intro: `${capitalize(period.label)}: gastaste ${money(total, ctx.baseCurrency)}.`,
    blocks: [
      {
        type: 'breakdown',
        title: 'Por categoría',
        rows,
        total: { label: 'Total', value: money(total, ctx.baseCurrency) },
      },
    ],
  }
}
