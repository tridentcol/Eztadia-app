import 'server-only'

import { listUnreadInsights } from '@/lib/db/queries/insights'
import type { IntentResolver } from '../types'

export const resolveInsightsActive: IntentResolver = async (_slots, ctx) => {
  const list = await listUnreadInsights(ctx.userId, 5)

  if (list.length === 0) {
    return {
      intro: 'Sin lecturas activas por ahora.',
      blocks: [
        {
          type: 'text',
          body: 'Cuando detecte algo relevante (una anomalía, una tendencia) aparecerá aquí.',
        },
      ],
    }
  }

  return {
    intro: `Tengo ${list.length} ${list.length === 1 ? 'lectura' : 'lecturas'} para ti.`,
    blocks: [
      {
        type: 'list',
        items: list.map((i) => ({
          id: i.id,
          primary: i.title,
          secondary: i.body,
          trailing:
            i.severity === 'warning' ? 'atención' : i.severity === 'notice' ? 'nota' : 'info',
          trailingTone:
            i.severity === 'warning' ? 'warning' : i.severity === 'notice' ? 'neutral' : 'neutral',
        })),
      },
    ],
  }
}
