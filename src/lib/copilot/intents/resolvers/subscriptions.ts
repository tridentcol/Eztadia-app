import 'server-only'

import { listRecurringForUser } from '@/lib/db/queries/recurring'
import { detectRecurring } from '@/lib/ai/insights/recurring-detection'
import type { AnswerBlock, ProposalAction } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money } from '../helpers'
import { toInsightContext } from '../../advice/metrics'
import { insightToAdvice } from '../../advice/to-advice'

/** Factor para normalizar una frecuencia a gasto mensual aproximado. */
const MONTHLY_FACTOR: Record<string, number> = {
  daily: 30,
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
}

export const resolveSubscriptions: IntentResolver = async (_slots, ctx) => {
  const rules = await listRecurringForUser(ctx.userId)
  const subs = rules.filter((r) => r.active && r.kind === 'expense')

  if (subs.length === 0) {
    return {
      intro: 'No tienes pagos recurrentes registrados.',
      blocks: [
        {
          type: 'text',
          body: 'Cuando detecte un cargo que se repite, puedo proponerte crear la regla.',
        },
      ],
    }
  }

  let monthlyTotal = 0
  for (const s of subs) {
    monthlyTotal += Number.parseFloat(s.amount) * (MONTHLY_FACTOR[s.frequency] ?? 1)
  }

  const blocks: AnswerBlock[] = [
    {
      type: 'amount',
      label: 'Gasto recurrente mensual',
      value: money(monthlyTotal, ctx.baseCurrency),
      currency: ctx.baseCurrency,
      tone: 'neutral',
      note: `${subs.length} ${subs.length === 1 ? 'suscripción' : 'suscripciones'}`,
    },
    {
      type: 'list',
      title: 'Tus recurrentes',
      items: subs.map((s) => ({
        id: s.id,
        primary: s.description,
        secondary: s.frequency,
        trailing: money(s.amount, s.currency),
        trailingTone: 'negative',
      })),
    },
  ]

  // Consejo: cargos que se repiten y no están registrados como regla.
  const actions: ProposalAction[] = []
  try {
    const detected = await detectRecurring(toInsightContext(ctx))
    const top = detected[0]
    if (top) {
      const { block, action } = insightToAdvice(top)
      blocks.push(block)
      if (action) actions.push(action)
    }
  } catch {
    // El consejo es opcional: si el detector falla, la respuesta igual sirve.
  }

  return actions.length > 0 ? { blocks, actions } : { blocks }
}
