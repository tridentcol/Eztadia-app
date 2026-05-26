import { tool } from 'ai'
import { z } from 'zod'

import { listTransactionsForUser } from '@/lib/db/queries/transactions'
import type { CopilotContext } from '../context'

const KIND = z.enum(['income', 'expense', 'transfer'])

export function listRecentTransactionsTool(ctx: CopilotContext) {
  return tool({
    description:
      'Lista las transacciones recientes del usuario, opcionalmente filtradas por kind/cuenta/categoría/rango de fechas. Devuelve hasta 50 filas con descripción, monto, fecha y categoría. Read-only.',
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
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async (input) => {
      const rows = await listTransactionsForUser(ctx.userId, {
        kind: input.kind,
        from: input.from,
        to: input.to,
        limit: input.limit ?? 20,
      })
      return {
        baseCurrency: ctx.baseCurrency,
        count: rows.length,
        transactions: rows.map((t) => ({
          id: t.id,
          date: t.date,
          description: t.description,
          merchant: t.merchant,
          kind: t.kind,
          amount: t.amountOriginal,
          currency: t.currency,
          amountBase: t.amountBase,
          account: t.account.name,
          category: t.category?.name ?? null,
          aiCategorized: t.aiCategorized,
        })),
      }
    },
  })
}
