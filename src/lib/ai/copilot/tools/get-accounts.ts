import { tool } from 'ai'
import { z } from 'zod'

import { listAccountsWithBalance } from '@/lib/db/queries/accounts'
import type { CopilotContext } from '../context'

/**
 * Detalle por cuenta con foco en lo accionable: saldo, y para tarjetas de
 * crédito el cupo, utilización y días de corte/pago. Complementa getBalance
 * (que da el total agregado). Read-only.
 */
export function getAccountsTool(ctx: CopilotContext) {
  return tool({
    description:
      'Cuentas del usuario con detalle accionable: saldo en su moneda, y para tarjetas de crédito (type=credit_card) el cupo, la utilización (% usado) y los días de corte y pago. Útil para "cómo está mi tarjeta", "cuánto cupo me queda", "qué cuentas tengo".',
    inputSchema: z.object({
      includeArchived: z.boolean().optional(),
    }),
    execute: async (input) => {
      const accounts = await listAccountsWithBalance(ctx.userId, {
        includeArchived: input.includeArchived ?? false,
      })
      return {
        baseCurrency: ctx.baseCurrency,
        count: accounts.length,
        accounts: accounts.map((a) => {
          const balance = Number.parseFloat(a.currentBalance)
          const limit = a.creditLimit ? Number.parseFloat(a.creditLimit) : null
          // En tarjetas, un saldo negativo es deuda; la utilización es deuda/cupo.
          const utilizationPct =
            a.type === 'credit_card' && limit && limit > 0 && balance < 0
              ? Math.round((Math.abs(balance) / limit) * 100)
              : null
          return {
            name: a.name,
            type: a.type,
            currency: a.currency,
            balance: a.currentBalance,
            creditLimit: a.creditLimit,
            utilizationPct,
            statementDay: a.statementDay,
            paymentDay: a.paymentDay,
            archived: a.archived,
          }
        }),
      }
    },
  })
}
