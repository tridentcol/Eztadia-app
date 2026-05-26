import { tool } from 'ai'
import { z } from 'zod'

import { listBudgetsWithProgress } from '@/lib/db/queries/budgets'
import type { CopilotContext } from '../context'

export function getBudgetStatusTool(ctx: CopilotContext) {
  return tool({
    description:
      'Estado de los presupuestos activos del usuario: categoría, monto, gastado, porcentaje, status (safe/warning/exceeded) y rango del período. Read-only.',
    inputSchema: z.object({}),
    execute: async () => {
      const budgets = await listBudgetsWithProgress(ctx.userId)
      return {
        baseCurrency: ctx.baseCurrency,
        budgets: budgets.map((b) => ({
          category: b.categoryName,
          amount: b.amount,
          spent: b.spent,
          percent: Math.round(b.percent * 100),
          status: b.status,
          period: b.period,
          periodStart: b.periodStart,
          periodEnd: b.periodEnd,
        })),
      }
    },
  })
}
