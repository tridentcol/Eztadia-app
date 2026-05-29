import 'server-only'

import { listBudgetsWithProgress } from '@/lib/db/queries/budgets'
import type { AnswerBlock } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

export const resolveBudgetStatus: IntentResolver = async (slots, ctx) => {
  const budgets = await listBudgetsWithProgress(ctx.userId)

  if (budgets.length === 0) {
    return {
      intro: 'No tienes presupuestos activos.',
      blocks: [
        {
          type: 'text',
          body: 'Crea uno desde Mi plan → Presupuestos, o pídeme "ponme un presupuesto de 500k en Mercado".',
        },
      ],
    }
  }

  const filtered = slots.category
    ? budgets.filter((b) => b.categoryId === slots.category!.id)
    : budgets

  if (filtered.length === 0) {
    return {
      intro: `No tienes un presupuesto para ${slots.category?.name}.`,
      blocks: [{ type: 'text', body: 'Puedo ayudarte a crear uno si quieres.' }],
    }
  }

  // Orden: los que requieren atención primero.
  const sorted = [...filtered].sort((a, b) => b.percent - a.percent)
  const atRisk = sorted.filter((b) => b.status !== 'safe').length

  const blocks: AnswerBlock[] = sorted.slice(0, 6).map((b) => ({
    type: 'gauge' as const,
    label: b.categoryName,
    spent: money(b.spent, ctx.baseCurrency),
    limit: money(b.amount, ctx.baseCurrency),
    percent: b.percent,
    status: b.status,
  }))

  const intro = slots.category
    ? `Presupuesto de ${slots.category.name}.`
    : atRisk === 0
      ? `Tus ${filtered.length} presupuestos están en rango seguro.`
      : `${atRisk} de ${filtered.length} presupuestos requieren atención.`

  return { intro, blocks }
}
