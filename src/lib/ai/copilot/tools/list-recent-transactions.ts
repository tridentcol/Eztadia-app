import { tool } from 'ai'
import { z } from 'zod'

import { listTransactionsForUser } from '@/lib/db/queries/transactions'
import type { CopilotContext } from '../context'

const KIND = z.enum(['income', 'expense', 'transfer'])

/**
 * Lista compacta de transacciones recientes (cap 25, default 15) + suma en base
 * de las devueltas. Para cifras agregadas precisas usa queryTransactions; esto
 * es para "muéstrame los últimos movimientos". Read-only.
 */
export function listRecentTransactionsTool(ctx: CopilotContext) {
  return tool({
    description:
      'Lista las transacciones recientes del usuario (hasta 25), opcionalmente filtradas por kind/rango de fechas, con la suma en moneda base de las devueltas. Para totales por categoría/comercio o promedios usa queryTransactions. Read-only.',
    inputSchema: z.object({
      kind: KIND.optional(),
      from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe('Fecha inicial inclusiva YYYY-MM-DD'),
      to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe('Fecha final inclusiva YYYY-MM-DD'),
      limit: z.number().int().min(1).max(25).optional(),
    }),
    execute: async (input) => {
      const rows = await listTransactionsForUser(ctx.userId, {
        kind: input.kind,
        from: input.from,
        to: input.to,
        limit: input.limit ?? 15,
      })
      let totalBase = 0
      for (const t of rows) {
        const v = Number.parseFloat(t.amountBase)
        if (Number.isFinite(v)) totalBase += v
      }
      return {
        baseCurrency: ctx.baseCurrency,
        count: rows.length,
        totalBase: totalBase.toFixed(2),
        transactions: rows.map((t) => ({
          date: t.date,
          description: t.description,
          merchant: t.merchant,
          kind: t.kind,
          amount: t.amountOriginal,
          currency: t.currency,
          amountBase: t.amountBase,
          account: t.account.name,
          category: t.category?.name ?? null,
        })),
      }
    },
  })
}
