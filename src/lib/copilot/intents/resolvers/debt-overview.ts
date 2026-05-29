import 'server-only'

import { getDebtsSummary, listDebts } from '@/lib/db/queries/debts'
import type { CurrencyCode } from '@/lib/currency/currencies'
import type { AnswerBlock } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

export const resolveDebtOverview: IntentResolver = async (_slots, ctx) => {
  const [summary, debts] = await Promise.all([
    getDebtsSummary(ctx.userId, ctx.baseCurrency as CurrencyCode),
    listDebts(ctx.userId),
  ])

  const active = debts.filter((d) => d.status === 'active')
  if (active.length === 0) {
    return {
      intro: 'No tienes deudas activas.',
      blocks: [{ type: 'text', body: 'Nada pendiente por aquí.' }],
    }
  }

  const blocks: AnswerBlock[] = [
    {
      type: 'amount',
      label: 'Total que debes',
      value: money(summary.totalBalanceInBase, ctx.baseCurrency),
      currency: ctx.baseCurrency,
      tone: 'negative',
      note: summary.partial ? 'Con conversión parcial' : `${summary.activeCount} ${summary.activeCount === 1 ? 'deuda' : 'deudas'}`,
    },
    {
      type: 'list',
      title: 'Por deuda',
      items: active.map((d) => ({
        id: d.id,
        primary: d.name,
        secondary: d.nextPaymentDate ? `Próximo pago ${d.nextPaymentDate}` : undefined,
        trailing: money(d.currentBalance, d.currency),
        trailingTone: 'negative',
      })),
    },
  ]

  return { blocks }
}
