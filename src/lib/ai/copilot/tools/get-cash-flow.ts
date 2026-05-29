import { tool } from 'ai'
import { z } from 'zod'

import { currencies, isSupportedCurrency } from '@/lib/currency/currencies'
import { getNetCashFlowForPeriod } from '@/lib/db/queries/savings'
import type { CopilotContext } from '../context'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Resta `days` días a una fecha ISO (UTC). */
function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Días inclusivos entre dos fechas ISO. */
function inclusiveDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime()
  const b = new Date(`${to}T00:00:00Z`).getTime()
  return Math.round((b - a) / 86_400_000) + 1
}

/**
 * Flujo neto (ingresos − gastos) de un período en moneda base, con tasa de
 * ahorro y comparación opcional contra el período anterior de igual longitud.
 * Read-only. Cifras exactas vía SQL (sin alucinación).
 */
export function getCashFlowTool(ctx: CopilotContext) {
  return tool({
    description:
      'Flujo de caja del usuario en un período: ingresos, gastos, neto y tasa de ahorro, en moneda base. Opcionalmente compara contra el período anterior de igual longitud. Útil para "cuánto gané vs gasté este mes", "estoy ahorrando o gastando de más", "cómo cambió mi flujo".',
    inputSchema: z.object({
      from: z.string().regex(ISO_DATE).describe('Fecha inicial inclusiva YYYY-MM-DD.'),
      to: z.string().regex(ISO_DATE).describe('Fecha final inclusiva YYYY-MM-DD.'),
      comparePrevious: z
        .boolean()
        .optional()
        .describe('Si true, compara contra el período anterior de igual longitud.'),
    }),
    execute: async (input) => {
      // Redondeo a los decimales de la moneda base (COP=0, USD/EUR=2): preserva
      // centavos en multi-divisa.
      const decimals = isSupportedCurrency(ctx.baseCurrency)
        ? currencies[ctx.baseCurrency].decimals
        : 2
      const roundMoney = (v: number) => Number(v.toFixed(decimals))

      const current = await getNetCashFlowForPeriod(ctx.userId, input.from, input.to)
      const savingsRatePct =
        current.income > 0 ? Math.round((current.net / current.income) * 100) : null

      const result: {
        baseCurrency: string
        period: { from: string; to: string }
        income: number
        expense: number
        net: number
        savingsRatePct: number | null
        previous?: { from: string; to: string; income: number; expense: number; net: number }
        deltaNet?: number
      } = {
        baseCurrency: ctx.baseCurrency,
        period: { from: input.from, to: input.to },
        income: roundMoney(current.income),
        expense: roundMoney(current.expense),
        net: roundMoney(current.net),
        savingsRatePct,
      }

      if (input.comparePrevious) {
        const len = inclusiveDays(input.from, input.to)
        const prevTo = shiftIso(input.from, -1)
        const prevFrom = shiftIso(prevTo, -(len - 1))
        const prev = await getNetCashFlowForPeriod(ctx.userId, prevFrom, prevTo)
        result.previous = {
          from: prevFrom,
          to: prevTo,
          income: roundMoney(prev.income),
          expense: roundMoney(prev.expense),
          net: roundMoney(prev.net),
        }
        result.deltaNet = roundMoney(current.net - prev.net)
      }

      return result
    },
  })
}
