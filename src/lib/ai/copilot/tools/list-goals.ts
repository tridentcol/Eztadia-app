import { tool } from 'ai'
import { z } from 'zod'

import { listGoalsForUser } from '@/lib/db/queries/goals'
import type { CopilotContext } from '../context'

/**
 * Metas financieras con progreso (logrado/objetivo, % y días al objetivo).
 * Read-only.
 */
export function listGoalsTool(ctx: CopilotContext) {
  return tool({
    description:
      'Metas financieras del usuario (fondos de emergencia, viajes, compras): objetivo, acumulado, porcentaje, días al objetivo y estado. Útil para "cómo van mis metas", "cuánto me falta para X".',
    inputSchema: z.object({
      onlyActive: z
        .boolean()
        .optional()
        .describe('Si true (default), solo metas en estado activo.'),
    }),
    execute: async (input) => {
      const onlyActive = input.onlyActive ?? true
      const all = await listGoalsForUser(ctx.userId)
      const goals = onlyActive ? all.filter((g) => g.status === 'active') : all
      return {
        baseCurrency: ctx.baseCurrency,
        count: goals.length,
        goals: goals.map((g) => ({
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          currency: g.currency,
          percent: Math.round(g.percent * 100),
          daysToTarget: g.daysToTarget,
          targetDate: g.targetDate,
          status: g.status,
          linkedAccount: g.linkedAccountName,
        })),
      }
    },
  })
}
