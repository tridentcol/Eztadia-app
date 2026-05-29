import 'server-only'

import { listAccountsWithBalance } from '@/lib/db/queries/accounts'
import { listTransactionsForUser } from '@/lib/db/queries/transactions'
import type { AnswerBlock } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

export const resolveAccountDetail: IntentResolver = async (slots, ctx) => {
  if (!slots.account) {
    return {
      intro: '¿De cuál cuenta?',
      blocks: [{ type: 'text', body: 'Dime el nombre de la cuenta (ej: "mi débito" o "Bancolombia").' }],
    }
  }

  const accounts = await listAccountsWithBalance(ctx.userId)
  const account = accounts.find((a) => a.id === slots.account!.id)
  if (!account) {
    return {
      intro: 'No encontré esa cuenta.',
      blocks: [{ type: 'text', body: 'Puede estar archivada o haber cambiado de nombre.' }],
    }
  }

  const recent = await listTransactionsForUser(ctx.userId, {
    accountId: account.id,
    limit: 5,
  })

  const blocks: AnswerBlock[] = [
    {
      type: 'amount',
      label: account.name,
      value: money(account.currentBalance, account.currency),
      currency: account.currency,
      tone: Number.parseFloat(account.currentBalance) >= 0 ? 'neutral' : 'negative',
    },
  ]

  if (recent.length > 0) {
    blocks.push({
      type: 'list',
      title: 'Últimos movimientos',
      items: recent.map((t) => ({
        id: t.id,
        primary: t.description,
        secondary: t.category?.name ?? t.date,
        trailing: `${t.kind === 'expense' ? '−' : t.kind === 'income' ? '+' : ''}${money(t.amountOriginal, t.currency)}`,
        trailingTone: t.kind === 'income' ? 'positive' : t.kind === 'expense' ? 'negative' : 'neutral',
      })),
    })
  }

  return { blocks }
}
