import 'server-only'

import { listTransactionsForUser } from '@/lib/db/queries/transactions'
import type { AnswerBlock, BreakdownRow } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money, periodOrThisMonth, capitalize } from '../helpers'
import { categoryDeltaVsBaseline } from '../../advice/metrics'

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
    // Consejo: solo si gastó notablemente más que su promedio histórico.
    const delta = await categoryDeltaVsBaseline(ctx, slots.category.id, period)
    if (delta && delta.deltaPct >= 0.2) {
      blocks.push({
        type: 'advice',
        tone: delta.deltaPct >= 0.5 ? 'warning' : 'neutral',
        title: `Gasto alto en ${slots.category.name}`,
        body: `Llevas ${money(delta.current, ctx.baseCurrency)}, ${Math.round(delta.deltaPct * 100)}% más que tu promedio mensual (${money(delta.avg, ctx.baseCurrency)}).`,
      })
    }

    // Sugerir un presupuesto mensual redondeado al gasto observado.
    const suggested = Math.round(total / 10000) * 10000
    return {
      intro: `Gastaste ${money(total, ctx.baseCurrency)} en ${slots.category.name}.`,
      blocks,
      actions:
        suggested > 0
          ? [
              {
                kind: 'create-budget-for-category',
                label: `Crear presupuesto de ${money(suggested, ctx.baseCurrency)}`,
                categoryId: slots.category.id,
                categoryName: slots.category.name,
                suggestedAmount: String(suggested),
              },
            ]
          : undefined,
    }
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
