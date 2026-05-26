import { tool } from 'ai'
import { z } from 'zod'

import {
  getTotalBalanceInBase,
  listAccountsWithBalance,
} from '@/lib/db/queries/accounts'
import type { CopilotContext } from '../context'

/**
 * Devuelve el saldo total agregado en moneda base + breakdown por cuenta
 * (en su moneda nativa). Read-only.
 */
export function getBalanceTool(ctx: CopilotContext) {
  return tool({
    description:
      'Saldo total del usuario en su moneda base, junto con el saldo por cada cuenta activa en su moneda nativa. Útil cuando el usuario pregunta "cuánto tengo", "cuál es mi saldo", o pide un panorama global.',
    inputSchema: z.object({}),
    execute: async () => {
      const accounts = await listAccountsWithBalance(ctx.userId)
      const total = await getTotalBalanceInBase(ctx.userId, ctx.baseCurrency)
      return {
        baseCurrency: ctx.baseCurrency,
        total: total.total,
        partial: total.partial,
        accounts: accounts.map((a) => ({
          name: a.name,
          type: a.type,
          currency: a.currency,
          balance: a.currentBalance,
          archived: a.archived,
        })),
      }
    },
  })
}
