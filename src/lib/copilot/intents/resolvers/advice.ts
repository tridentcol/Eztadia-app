import 'server-only'

import { collectLocalInsights } from '@/lib/ai/insights'
import type { AnswerBlock, ProposalAction } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { toInsightContext } from '../../advice/metrics'
import { insightToAdvice } from '../../advice/to-advice'

const SEVERITY_RANK: Record<string, number> = { warning: 0, notice: 1, info: 2 }

/**
 * Consejo explícito ("¿qué me recomendás?", "¿dónde puedo ahorrar?"). Corre los
 * 9 detectores locales en vivo, ordena por severidad y devuelve el top-3 como
 * bloques advice + acciones. Si no hay señal, es honesto: no inventa.
 */
export const resolveAdvice: IntentResolver = async (_slots, ctx) => {
  const insights = await collectLocalInsights(toInsightContext(ctx))

  if (insights.length === 0) {
    return {
      intro: 'Nada urgente por ahora.',
      blocks: [
        {
          type: 'text',
          body: 'Vigilo gastos inusuales, presupuestos que se van a pasar, suscripciones nuevas y tu ritmo de ahorro. Cuando aparezca algo accionable te lo digo.',
        },
      ],
    }
  }

  const top = [...insights]
    .sort((a, b) => (SEVERITY_RANK[a.severity ?? 'info'] ?? 3) - (SEVERITY_RANK[b.severity ?? 'info'] ?? 3))
    .slice(0, 3)

  const blocks: AnswerBlock[] = []
  const actions: ProposalAction[] = []
  for (const i of top) {
    const { block, action } = insightToAdvice(i)
    blocks.push(block)
    if (action && actions.length < 2) actions.push(action)
  }

  return {
    intro:
      top.length === 1
        ? 'Esto es lo que te recomiendo:'
        : `${top.length} cosas en las que te puedo ayudar:`,
    blocks,
    actions: actions.length > 0 ? actions : undefined,
  }
}
