import { tool } from 'ai'
import { z } from 'zod'

import { getSavingsHeroData } from '@/lib/db/queries/savings'
import type { CopilotContext } from '../context'

/**
 * Progreso de ahorro: total acumulado histórico + último período (meta vs
 * logrado, método del plan). Read-only.
 */
export function getSavingsTool(ctx: CopilotContext) {
  return tool({
    description:
      'Progreso de ahorro del usuario: total acumulado, número de períodos y el último período (meta, logrado, método del plan). Útil para "cómo voy con el ahorro", "cumplí mi meta de ahorro este mes".',
    inputSchema: z.object({}),
    execute: async () => {
      const hero = await getSavingsHeroData(ctx.userId)
      const last = hero.lastPeriod
      const lastPeriod = last
        ? {
            periodStart: last.periodStart,
            periodEnd: last.periodEnd,
            targetAmount: last.targetAmount,
            achievedAmount: last.achievedAmount,
            method: last.planMethod,
            percent: (() => {
              const target = Number.parseFloat(last.targetAmount)
              const achieved = Number.parseFloat(last.achievedAmount)
              return target > 0 ? Math.round((achieved / target) * 100) : null
            })(),
          }
        : null
      return {
        baseCurrency: ctx.baseCurrency,
        totalAchieved: Math.round(hero.totalAchieved),
        periodsCount: hero.periodsCount,
        lastPeriod,
      }
    },
  })
}
