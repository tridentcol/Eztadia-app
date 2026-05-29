import { tool } from 'ai'
import { z } from 'zod'

import { collectLocalInsights } from '@/lib/ai/insights'
import type { CopilotContext } from '../context'

/**
 * Corre en vivo los detectores locales de insights (anomalías, tendencias,
 * proyecciones, tasa de ahorro, dormancia, recurrentes, drift, gasto hormiga)
 * y los expone como señales accionables para que el LLM construya el consejo.
 * No persiste. Read-only.
 */
export function getAdviceTool(ctx: CopilotContext) {
  return tool({
    description:
      'Señales financieras detectadas en vivo para el usuario: anomalías de gasto, tendencias, proyecciones de fin de mes, tasa de ahorro, dinero dormido, cargos recurrentes y gasto hormiga. Úsalo como insumo para dar consejo accionable cuando el usuario pida recomendaciones ("qué debería hacer", "cómo mejoro", "dame un consejo") o un diagnóstico general.',
    inputSchema: z.object({}),
    execute: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const detected = await collectLocalInsights({
        userId: ctx.userId,
        baseCurrency: ctx.baseCurrency,
        today,
      })
      // Prioriza por severidad (warning > notice > info) y recorta para no inflar
      // el contexto.
      const rank: Record<string, number> = { warning: 0, notice: 1, info: 2 }
      const sorted = [...detected].sort(
        (a, b) => (rank[a.severity ?? 'info'] ?? 3) - (rank[b.severity ?? 'info'] ?? 3),
      )
      return {
        baseCurrency: ctx.baseCurrency,
        count: detected.length,
        signals: sorted.slice(0, 12).map((d) => ({
          kind: d.kind,
          severity: d.severity,
          title: d.title,
          body: d.body,
        })),
      }
    },
  })
}
