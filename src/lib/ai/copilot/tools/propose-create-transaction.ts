import 'server-only'
import { tool } from 'ai'
import { z } from 'zod'
import { and, eq, isNull, or } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { accounts, categories } from '@/lib/db/schema'
import type { CopilotContext } from '../context'

/**
 * NO ejecuta — sólo devuelve una propuesta validada (cuenta existe, categoría
 * existe). La UI rendea esto como tarjeta con botón "Confirmar" que dispara
 * la server action `createTransaction` real.
 *
 * Mandato regla 6: el LLM NUNCA muta sin confirmación UI. Este tool es la
 * encarnación de esa regla.
 */
export function proposeCreateTransactionTool(ctx: CopilotContext) {
  return tool({
    description:
      'Propone registrar una transacción nueva. NO ejecuta la mutación — devuelve la propuesta validada para que el usuario la apruebe en la UI antes de persistir. Usa este tool cuando el usuario diga "registra X", "anota Y", "agrega Z al gasto".',
    inputSchema: z.object({
      kind: z.enum(['income', 'expense', 'transfer']),
      accountName: z
        .string()
        .describe(
          'Nombre EXACTO de la cuenta origen (tal como aparece en accounts).',
        ),
      transferAccountName: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Nombre EXACTO de la cuenta destino si kind=transfer; null en caso contrario.',
        ),
      categoryName: z
        .string()
        .nullable()
        .optional()
        .describe('Nombre EXACTO de la categoría (sistema o del usuario), o null.'),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('Fecha YYYY-MM-DD (usar HOY si el usuario no especifica).'),
      amount: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/)
        .describe('Monto positivo en la moneda de la cuenta origen.'),
      description: z.string().min(1).max(200),
      merchant: z.string().max(120).nullable().optional(),
      notes: z.string().max(500).nullable().optional(),
    }),
    execute: async (input) => {
      const account = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.userId, ctx.userId),
          eq(accounts.name, input.accountName),
          eq(accounts.archived, false),
        ),
      })
      if (!account) {
        return {
          ok: false,
          error: `No encontré una cuenta llamada "${input.accountName}". Pide al usuario que confirme.`,
        }
      }

      let transferAccountId: string | null = null
      if (input.kind === 'transfer') {
        if (!input.transferAccountName) {
          return {
            ok: false,
            error: 'Transferencia requiere cuenta destino. Pide al usuario el nombre.',
          }
        }
        const target = await db.query.accounts.findFirst({
          where: and(
            eq(accounts.userId, ctx.userId),
            eq(accounts.name, input.transferAccountName),
            eq(accounts.archived, false),
          ),
        })
        if (!target) {
          return {
            ok: false,
            error: `No encontré cuenta destino "${input.transferAccountName}".`,
          }
        }
        transferAccountId = target.id
      }

      let categoryId: string | null = null
      if (input.categoryName) {
        const cat = await db.query.categories.findFirst({
          where: and(
            eq(categories.name, input.categoryName),
            eq(categories.kind, input.kind),
            eq(categories.archived, false),
            or(isNull(categories.userId), eq(categories.userId, ctx.userId)),
          ),
        })
        if (cat) categoryId = cat.id
      }

      return {
        ok: true,
        proposal: {
          kind: input.kind,
          accountId: account.id,
          accountName: account.name,
          accountCurrency: account.currency,
          transferAccountId,
          transferAccountName: input.transferAccountName ?? null,
          categoryId,
          categoryName: input.categoryName ?? null,
          date: input.date,
          amount: input.amount,
          currency: account.currency,
          description: input.description,
          merchant: input.merchant ?? null,
          notes: input.notes ?? null,
        },
        message:
          'Propuesta lista. La UI mostrará un botón de confirmación al usuario.',
      }
    },
  })
}
