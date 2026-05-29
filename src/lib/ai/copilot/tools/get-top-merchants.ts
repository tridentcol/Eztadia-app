import { tool } from 'ai'
import { z } from 'zod'

import { listMerchantsForUser, resolveRange } from '@/lib/db/queries/merchants'
import type { CopilotContext } from '../context'

/**
 * Comercios donde más gasta el usuario en un período (este mes o este año),
 * agregados por nombre normalizado, en moneda base. Read-only.
 */
export function getTopMerchantsTool(ctx: CopilotContext) {
  return tool({
    description:
      'Comercios donde más gasta el usuario, agregados en moneda base, para este mes o este año. Incluye total, número de transacciones y categoría dominante. Útil para "en qué más gasto", "mis comercios más caros".',
    inputSchema: z.object({
      scope: z
        .enum(['this-month', 'this-year'])
        .optional()
        .describe('Período: este mes (default) o este año.'),
      limit: z.number().int().min(1).max(20).optional(),
    }),
    execute: async (input) => {
      const range = resolveRange(input.scope ?? 'this-month')
      const merchants = await listMerchantsForUser(ctx.userId, range, {
        limit: input.limit ?? 8,
      })
      return {
        baseCurrency: ctx.baseCurrency,
        period: { label: range.label, from: range.from, to: range.to },
        count: merchants.length,
        merchants: merchants.map((m) => ({
          name: m.name,
          totalBase: m.totalBase,
          count: m.count,
          lastSeen: m.lastSeen,
          category: m.categoryName,
        })),
      }
    },
  })
}
