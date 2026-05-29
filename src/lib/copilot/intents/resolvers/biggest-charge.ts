import 'server-only'

import { listTransactionsForUser } from '@/lib/db/queries/transactions'
import type { AnswerBlock } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money, periodOrThisMonth, capitalize } from '../helpers'

export const resolveBiggestCharge: IntentResolver = async (slots, ctx) => {
  const period = periodOrThisMonth(slots, ctx)
  const limit = slots.ordering?.limit ?? 1
  const asc = slots.ordering?.order === 'asc'

  const txs = await listTransactionsForUser(ctx.userId, {
    kind: 'expense',
    from: period.from,
    to: period.to,
    categoryId: slots.category?.id,
    limit: 500,
  })

  if (txs.length === 0) {
    return {
      intro: `Sin gastos ${period.label}.`,
      blocks: [{ type: 'text', body: 'No hay movimientos de gasto en ese período.' }],
    }
  }

  const sorted = [...txs].sort((a, b) => {
    const av = Number.parseFloat(a.amountBase)
    const bv = Number.parseFloat(b.amountBase)
    return asc ? av - bv : bv - av
  })
  const picked = sorted.slice(0, Math.max(1, limit))
  const superlative = asc ? 'más barato' : 'más caro'

  if (picked.length === 1) {
    const t = picked[0]!
    return {
      intro: `Tu gasto ${superlative} ${period.label}.`,
      blocks: [
        {
          type: 'amount',
          label: t.merchant ?? t.description,
          value: money(t.amountBase, ctx.baseCurrency),
          currency: ctx.baseCurrency,
          tone: 'neutral',
          note: `${t.date}${t.category ? ` · ${t.category.name}` : ''}`,
        },
      ],
    }
  }

  const blocks: AnswerBlock[] = [
    {
      type: 'list',
      title: `${capitalize(period.label)} · gastos ${asc ? 'menores' : 'mayores'}`,
      items: picked.map((t) => ({
        id: t.id,
        primary: t.merchant ?? t.description,
        secondary: `${t.date}${t.category ? ` · ${t.category.name}` : ''}`,
        trailing: money(t.amountBase, ctx.baseCurrency),
      })),
    },
  ]
  return { intro: `Tus ${picked.length} gastos ${asc ? 'menores' : 'mayores'} ${period.label}.`, blocks }
}
