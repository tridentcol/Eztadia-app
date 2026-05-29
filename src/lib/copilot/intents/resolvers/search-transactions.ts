import 'server-only'

import { listTransactionsForUser } from '@/lib/db/queries/transactions'
import type { IntentResolver } from '../types'
import { money, periodOrThisMonth } from '../helpers'

export const resolveSearchTransactions: IntentResolver = async (slots, ctx) => {
  const term = slots.merchant?.name ?? slots.query
  if (!term || term.length < 2) {
    return {
      intro: '¿Qué quieres buscar?',
      blocks: [{ type: 'text', body: 'Ejemplo: "busca pagos a Uber" o "movimientos de Netflix".' }],
    }
  }

  // Si hubo merchant resuelto, filtramos por su slug; si no, búsqueda libre.
  const period = slots.period ? periodOrThisMonth(slots, ctx) : null
  const txs = await listTransactionsForUser(ctx.userId, {
    merchantSlug: slots.merchant?.slug,
    searchQuery: slots.merchant ? undefined : slots.query,
    from: period?.from,
    to: period?.to,
    limit: 20,
  })

  if (txs.length === 0) {
    return {
      intro: `Sin coincidencias para "${term}"${period ? ` ${period.label}` : ''}.`,
      blocks: [{ type: 'text', body: 'Prueba con otro término o sin filtro de fecha.' }],
    }
  }

  const total = txs.reduce((acc, t) => acc + Number.parseFloat(t.amountBase), 0)

  return {
    intro: `${txs.length} ${txs.length === 1 ? 'coincidencia' : 'coincidencias'} para "${term}" · ${money(total, ctx.baseCurrency)}.`,
    blocks: [
      {
        type: 'list',
        items: txs.map((t) => ({
          id: t.id,
          primary: t.merchant ?? t.description,
          secondary: `${t.date}${t.category ? ` · ${t.category.name}` : ''}`,
          trailing: `${t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : ''}${money(t.amountOriginal, t.currency)}`,
          trailingTone: t.kind === 'income' ? 'positive' : t.kind === 'expense' ? 'negative' : 'neutral',
        })),
      },
    ],
  }
}
