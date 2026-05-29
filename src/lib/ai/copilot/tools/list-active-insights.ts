import { tool } from 'ai'
import { z } from 'zod'

import { listInsightsForUser } from '@/lib/db/queries/insights'
import type { CopilotContext } from '../context'

export function listActiveInsightsTool(ctx: CopilotContext) {
  return tool({
    description:
      'Lecturas activas (no descartadas ni resueltas) que la IA ha generado para el usuario: anomalías, tendencias, proyecciones y recomendaciones. Útil para responder "¿qué ha detectado Finanzia?".',
    inputSchema: z.object({
      kind: z
        .enum(['anomaly', 'trend', 'forecast', 'recommendation', 'achievement'])
        .optional(),
      limit: z.number().int().min(1).max(15).optional(),
    }),
    execute: async (input) => {
      const rows = await listInsightsForUser(ctx.userId, {
        kind: input.kind,
        limit: input.limit ?? 8,
      })
      // Sin `data` (jsonb potencialmente grande) ni `id`: el LLM solo necesita el
      // contenido legible para sintetizar.
      return {
        count: rows.length,
        insights: rows.map((i) => ({
          kind: i.kind,
          severity: i.severity,
          title: i.title,
          body: i.body,
          status: i.status,
          createdAt: i.createdAt.toISOString().slice(0, 10),
        })),
      }
    },
  })
}
