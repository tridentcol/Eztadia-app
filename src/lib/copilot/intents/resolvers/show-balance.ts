import 'server-only'

import {
  getTotalBalanceInBase,
  listAccountsWithBalance,
} from '@/lib/db/queries/accounts'
import type { AnswerBlock } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

export const resolveShowBalance: IntentResolver = async (_slots, ctx) => {
  const accounts = await listAccountsWithBalance(ctx.userId)
  const snap = await getTotalBalanceInBase(ctx.userId, ctx.baseCurrency, accounts)

  if (accounts.length === 0) {
    return {
      intro: 'Todavía no tienes cuentas registradas.',
      blocks: [
        { type: 'text', body: 'Agrega tu primera cuenta para ver tu saldo aquí.' },
      ],
    }
  }

  // Sólo cuentas con saldo positivo entran al desglose de "tienes"; las de
  // crédito (saldo negativo) se mencionan aparte para no distorsionar la barra.
  const positives = accounts.filter((a) => Number.parseFloat(a.currentBalance) > 0)
  const totalPositive = positives.reduce(
    (acc, a) => acc + Number.parseFloat(a.currentBalance),
    0,
  )

  const blocks: AnswerBlock[] = [
    {
      type: 'amount',
      label: 'Saldo total',
      value: money(snap.total, ctx.baseCurrency),
      currency: ctx.baseCurrency,
      tone: Number.parseFloat(snap.total) >= 0 ? 'neutral' : 'negative',
      note: snap.partial ? 'Con conversión parcial (faltan tasas)' : undefined,
    },
  ]

  if (positives.length > 0) {
    blocks.push({
      type: 'breakdown',
      title: 'Por cuenta',
      rows: positives.map((a) => {
        const v = Number.parseFloat(a.currentBalance)
        return {
          label: a.name,
          value: money(a.currentBalance, a.currency),
          fraction: totalPositive > 0 ? v / totalPositive : 0,
          sub: a.type === 'credit_card' ? 'tarjeta' : a.type,
        }
      }),
    })
  }

  return {
    intro: `Tienes ${accounts.length} ${accounts.length === 1 ? 'cuenta' : 'cuentas'}.`,
    blocks,
  }
}
