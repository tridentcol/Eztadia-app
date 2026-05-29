import 'server-only'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { listAccountsWithBalance } from '@/lib/db/queries/accounts'
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

  // Una sola query con la última actividad por cuenta (en vez de N consultas).
  const activity = await db.execute<{ account_id: string; last: string | null }>(sql`
    SELECT account_id, MAX(date)::text AS last
    FROM transactions
    WHERE user_id = ${ctx.userId} AND deleted_at IS NULL
    GROUP BY account_id
  `)
  const lastByAccount = new Map(activity.map((r) => [r.account_id, r.last]))

  const dormant = liquid
    .map((account) => ({ account, lastDate: lastByAccount.get(account.id) ?? null }))
    .filter((c) => c.lastDate === null || c.lastDate < cutoffIso)

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
