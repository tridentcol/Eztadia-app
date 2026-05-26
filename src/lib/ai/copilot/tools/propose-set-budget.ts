import 'server-only'
import { tool } from 'ai'
import { z } from 'zod'
import { and, eq, isNull, or } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { budgets, categories } from '@/lib/db/schema'
import type { CopilotContext } from '../context'

/**
 * Propone crear o actualizar un presupuesto. No ejecuta — la UI muestra
 * tarjeta con botón "Confirmar" que dispara la server action correspondiente.
 */
export function proposeSetBudgetTool(ctx: CopilotContext) {
  return tool({
    description:
      'Propone crear (o ajustar) un presupuesto sobre una categoría expense del usuario. NO ejecuta — devuelve la propuesta para confirmación en UI. Usa este tool cuando el usuario diga "ponme un presupuesto de X en Y", "limita mi gasto en Z".',
    inputSchema: z.object({
      categoryName: z
        .string()
        .describe(
          'Nombre EXACTO de la categoría expense (sistema o del usuario).',
        ),
      amount: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/)
        .describe('Monto en moneda base. Siempre positivo.'),
      period: z.enum(['monthly', 'weekly', 'yearly']).default('monthly'),
      rollover: z.boolean().default(false),
    }),
    execute: async (input) => {
      const cat = await db.query.categories.findFirst({
        where: and(
          eq(categories.name, input.categoryName),
          eq(categories.kind, 'expense'),
          eq(categories.archived, false),
          or(isNull(categories.userId), eq(categories.userId, ctx.userId)),
        ),
      })
      if (!cat) {
        return {
          ok: false,
          error: `No encontré categoría expense "${input.categoryName}".`,
        }
      }
      const existing = await db
        .select({ id: budgets.id, amount: budgets.amount, period: budgets.period })
        .from(budgets)
        .where(
          and(
            eq(budgets.userId, ctx.userId),
            eq(budgets.categoryId, cat.id),
            eq(budgets.archived, false),
          ),
        )
        .limit(1)

      return {
        ok: true,
        proposal: {
          mode: existing[0] ? 'update' : 'create',
          existingBudgetId: existing[0]?.id ?? null,
          categoryId: cat.id,
          categoryName: cat.name,
          amount: input.amount,
          period: input.period,
          rollover: input.rollover,
        },
        message:
          'Propuesta lista. La UI mostrará un botón de confirmación al usuario.',
      }
    },
  })
}
