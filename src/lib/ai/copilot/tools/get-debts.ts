import { tool } from 'ai'
import { z } from 'zod'

import { getDebtsSummary, listDebts } from '@/lib/db/queries/debts'
import type { CurrencyCode } from '@/lib/currency/currencies'
import type { CopilotContext } from '../context'

/**
 * Panorama de deudas: resumen agregado (saldo total en base, próximo pago) +
 * detalle compacto por deuda. NO incluye tarjetas de crédito — esas viven en
 * `accounts.type='credit_card'` (ver getAccounts). Read-only.
 */
export function getDebtsTool(ctx: CopilotContext) {
  return tool({
    description:
      'Deudas del usuario (préstamos, hipotecas, etc. — NO tarjetas de crédito): saldo total en moneda base, próximo pago, y detalle por deuda con tasa, cuota y plazo. Útil para "cómo van mis deudas", "qué pago primero", "cuánto debo".',
    inputSchema: z.object({}),
    execute: async () => {
      const [summary, debts] = await Promise.all([
        getDebtsSummary(ctx.userId, ctx.baseCurrency as CurrencyCode),
        listDebts(ctx.userId),
      ])
      return {
        baseCurrency: ctx.baseCurrency,
        summary: {
          totalBalanceInBase: summary.totalBalanceInBase,
          partial: summary.partial,
          activeCount: summary.activeCount,
          nextPayment: summary.nextPayment,
        },
        debts: debts.map((d) => ({
          name: d.name,
          lender: d.lender,
          type: d.type,
          currentBalance: d.currentBalance,
          currency: d.currency,
          interestRateAnnualPct: d.interestRate,
          installmentAmount: d.installmentAmount,
          termMonths: d.termMonths,
          nextPaymentDate: d.nextPaymentDate,
          status: d.status,
        })),
      }
    },
  })
}
