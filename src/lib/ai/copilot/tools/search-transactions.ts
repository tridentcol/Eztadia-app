import 'server-only'
import { tool } from 'ai'
import { z } from 'zod'
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { accounts, categories, transactions } from '@/lib/db/schema'
import type { CopilotContext } from '../context'

export function searchTransactionsTool(ctx: CopilotContext) {
  return tool({
    description:
      'Busca transacciones por texto libre en descripción o merchant. Soporta filtros adicionales por kind y rango de fechas. Útil para responder preguntas tipo "cuánto gasté en Uber este mes" o "encuentra el pago a Netflix".',
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .max(80)
        .describe('Término o frase a buscar (case-insensitive, ILIKE).'),
      kind: z.enum(['income', 'expense', 'transfer']).optional(),
      from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async (input) => {
      const conditions = [
        eq(transactions.userId, ctx.userId),
        isNull(transactions.deletedAt),
        or(
          ilike(transactions.description, `%${input.query}%`),
          ilike(transactions.merchant, `%${input.query}%`),
        )!,
      ]
      if (input.kind) conditions.push(eq(transactions.kind, input.kind))
      if (input.from) conditions.push(sql`${transactions.date} >= ${input.from}`)
      if (input.to) conditions.push(sql`${transactions.date} <= ${input.to}`)

      const rows = await db
        .select({
          id: transactions.id,
          date: transactions.date,
          description: transactions.description,
          merchant: transactions.merchant,
          kind: transactions.kind,
          amount: transactions.amountOriginal,
          currency: transactions.currency,
          amountBase: transactions.amountBase,
          accountName: accounts.name,
          categoryName: categories.name,
        })
        .from(transactions)
        .leftJoin(accounts, eq(accounts.id, transactions.accountId))
        .leftJoin(categories, eq(categories.id, transactions.categoryId))
        .where(and(...conditions))
        .orderBy(desc(transactions.date))
        .limit(input.limit ?? 20)

      // Agregado útil para el LLM: suma en moneda base de los matches.
      let totalBase = 0
      for (const r of rows) {
        const v = Number.parseFloat(r.amountBase)
        if (Number.isFinite(v)) totalBase += v
      }

      return {
        baseCurrency: ctx.baseCurrency,
        count: rows.length,
        totalBase: totalBase.toFixed(2),
        transactions: rows.map((r) => ({
          id: r.id,
          date: r.date,
          description: r.description,
          merchant: r.merchant,
          kind: r.kind,
          amount: r.amount,
          currency: r.currency,
          amountBase: r.amountBase,
          account: r.accountName,
          category: r.categoryName,
        })),
      }
    },
  })
}
