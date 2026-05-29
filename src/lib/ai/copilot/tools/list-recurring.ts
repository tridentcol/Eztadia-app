import { tool } from 'ai'
import { z } from 'zod'

import { listRecurringForUser } from '@/lib/db/queries/recurring'
import type { CopilotContext } from '../context'

/** Factor para normalizar una frecuencia a su equivalente mensual aproximado. */
const MONTHLY_FACTOR: Record<string, number> = {
  daily: 30,
  weekly: 4.3333,
  biweekly: 2.1667,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
}

/**
 * Reglas recurrentes (suscripciones, nómina, arriendo, etc.). Devuelve las
 * activas con su próximo cobro y un estimado de gasto mensual recurrente por
 * moneda (no convierte entre divisas para no inventar tasas). Read-only.
 */
export function listRecurringTool(ctx: CopilotContext) {
  return tool({
    description:
      'Reglas recurrentes del usuario: suscripciones, arriendo, nómina y otros cargos/ingresos periódicos. Incluye próximo cobro y un estimado de gasto mensual recurrente por moneda. Útil para "qué suscripciones tengo", "cuánto se me va fijo al mes", "qué pagos vienen".',
    inputSchema: z.object({
      onlyActive: z
        .boolean()
        .optional()
        .describe('Si true (default), solo reglas activas.'),
    }),
    execute: async (input) => {
      const onlyActive = input.onlyActive ?? true
      const all = await listRecurringForUser(ctx.userId)
      const rules = onlyActive ? all.filter((r) => r.active) : all

      // Estimado mensual de gasto recurrente, agrupado por moneda (sin convertir).
      const monthlyExpenseByCurrency: Record<string, number> = {}
      for (const r of rules) {
        if (r.kind !== 'expense' || !r.active) continue
        const factor = MONTHLY_FACTOR[r.frequency] ?? 1
        const monthly = Number.parseFloat(r.amount) * factor
        if (!Number.isFinite(monthly)) continue
        monthlyExpenseByCurrency[r.currency] =
          (monthlyExpenseByCurrency[r.currency] ?? 0) + monthly
      }
      const monthlyExpenseByCurrencyRounded = Object.fromEntries(
        Object.entries(monthlyExpenseByCurrency).map(([cur, v]) => [
          cur,
          Math.round(v),
        ]),
      )

      return {
        baseCurrency: ctx.baseCurrency,
        activeCount: rules.filter((r) => r.active).length,
        monthlyExpenseByCurrency: monthlyExpenseByCurrencyRounded,
        rules: rules.map((r) => ({
          description: r.description,
          amount: r.amount,
          currency: r.currency,
          kind: r.kind,
          frequency: r.frequency,
          nextRun: r.nextRun,
          account: r.accountName,
          category: r.categoryName,
          active: r.active,
          autoCreate: r.autoCreate,
        })),
      }
    },
  })
}
