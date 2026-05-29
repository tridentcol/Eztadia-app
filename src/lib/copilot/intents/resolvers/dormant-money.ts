import 'server-only'

import { listAccountsWithBalance } from '@/lib/db/queries/accounts'
import { listTransactionsForUser } from '@/lib/db/queries/transactions'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

const DORMANT_DAYS = 60

export const resolveDormantMoney: IntentResolver = async (_slots, ctx) => {
  const accounts = await listAccountsWithBalance(ctx.userId)
  // Sólo cuentas líquidas con saldo positivo son candidatas a "dinero quieto".
  const liquid = accounts.filter(
    (a) => a.type !== 'credit_card' && Number.parseFloat(a.currentBalance) > 0,
  )

  const cutoff = new Date(`${ctx.todayIso}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - DORMANT_DAYS)
  const cutoffIso = cutoff.toISOString().slice(0, 10)

  const checks = await Promise.all(
    liquid.map(async (a) => {
      const last = await listTransactionsForUser(ctx.userId, { accountId: a.id, limit: 1 })
      const lastDate = last[0]?.date ?? null
      return { account: a, lastDate }
    }),
  )

  const dormant = checks.filter((c) => c.lastDate === null || c.lastDate < cutoffIso)

  if (dormant.length === 0) {
    return {
      intro: 'No veo dinero quieto.',
      blocks: [
        { type: 'text', body: `Todas tus cuentas con saldo tuvieron movimiento en los últimos ${DORMANT_DAYS} días.` },
      ],
    }
  }

  const total = dormant.reduce((acc, c) => acc + Number.parseFloat(c.account.currentBalance), 0)

  return {
    intro: `${dormant.length} ${dormant.length === 1 ? 'cuenta' : 'cuentas'} sin movimiento en ${DORMANT_DAYS} días.`,
    blocks: [
      {
        type: 'amount',
        label: 'Dinero quieto',
        value: money(total, ctx.baseCurrency),
        currency: ctx.baseCurrency,
        tone: 'warning',
      },
      {
        type: 'list',
        items: dormant.map((c) => ({
          id: c.account.id,
          primary: c.account.name,
          secondary: c.lastDate ? `Último movimiento ${c.lastDate}` : 'Sin movimientos',
          trailing: money(c.account.currentBalance, c.account.currency),
        })),
      },
    ],
  }
}
