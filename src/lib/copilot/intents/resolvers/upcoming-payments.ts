import 'server-only'

import { listRecurringForUser } from '@/lib/db/queries/recurring'
import { listDebts } from '@/lib/db/queries/debts'
import type { TimelineItem } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

export const resolveUpcomingPayments: IntentResolver = async (slots, ctx) => {
  // Ventana: el período si se indicó; si no, próximos 30 días.
  const today = ctx.todayIso
  let to: string
  if (slots.period) {
    to = slots.period.to
  } else {
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 30)
    to = d.toISOString().slice(0, 10)
  }

  const [rules, debts] = await Promise.all([
    listRecurringForUser(ctx.userId),
    listDebts(ctx.userId),
  ])

  const items: TimelineItem[] = []

  for (const r of rules) {
    if (!r.active || !r.nextRun) continue
    if (r.nextRun < today || r.nextRun > to) continue
    items.push({
      id: r.id,
      dateLabel: r.nextRun,
      primary: r.description,
      amount: `${r.kind === 'income' ? '+' : '−'}${money(r.amount, r.currency)}`,
      tone: r.kind === 'income' ? 'positive' : 'negative',
    })
  }

  for (const d of debts) {
    if (d.status !== 'active' || !d.nextPaymentDate) continue
    if (d.nextPaymentDate < today || d.nextPaymentDate > to) continue
    items.push({
      id: d.id,
      dateLabel: d.nextPaymentDate,
      primary: d.name,
      amount: d.installmentAmount ? `−${money(d.installmentAmount, d.currency)}` : '—',
      tone: 'negative',
    })
  }

  if (items.length === 0) {
    return {
      intro: slots.period ? `Sin pagos programados ${slots.period.label}.` : 'Sin pagos en los próximos 30 días.',
      blocks: [{ type: 'text', body: 'No hay reglas recurrentes ni cuotas de deuda en esa ventana.' }],
    }
  }

  items.sort((a, b) => (a.dateLabel < b.dateLabel ? -1 : 1))

  return {
    intro: `${items.length} ${items.length === 1 ? 'pago próximo' : 'pagos próximos'}.`,
    blocks: [{ type: 'event-list', items }],
  }
}
