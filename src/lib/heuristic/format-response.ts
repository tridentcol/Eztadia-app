import 'server-only'

import type { HeuristicCard, HeuristicResponse } from './types'

/**
 * Convierte una `HeuristicResponse` a Markdown plano para emitir en el
 * UIMessageStream como un único text part. Mantiene el cliente simple
 * (no necesita render de cards estructurados) — los datos siguen siendo
 * legibles y bien formateados.
 */
export function formatHeuristicMarkdown(response: HeuristicResponse): string {
  const parts: string[] = []
  if (response.text) parts.push(response.text)

  for (const card of response.cards ?? []) {
    parts.push(formatCard(card))
  }

  return parts.join('\n\n')
}

function formatCard(card: HeuristicCard): string {
  switch (card.kind) {
    case 'balance':
      return [
        '**Por cuenta:**',
        ...card.rows.map((r) => `- ${r.label} · ${r.value}${r.sub ? ` _(${r.sub})_` : ''}`),
      ].join('\n')

    case 'expense-summary':
      return [
        '**Por categoría:**',
        ...card.rows.map((r) => `- ${r.label} · ${r.value}`),
      ].join('\n')

    case 'budgets':
      return [
        '**Presupuestos:**',
        ...card.rows.map((r) => {
          const dot = r.status === 'exceeded' ? '●' : r.status === 'warning' ? '◐' : '○'
          return `- ${dot} ${r.category} · ${r.spent} / ${r.amount} · ${r.percent}%`
        }),
      ].join('\n')

    case 'insights':
      return [
        '**Lecturas activas:**',
        ...card.rows.map((r) => `- **${r.title}** — ${r.body}`),
      ].join('\n')

    case 'transactions':
      return [
        '**Coincidencias:**',
        ...card.rows.slice(0, 10).map((r) =>
          `- ${r.date} · ${r.description} · ${r.amount}${r.category ? ` · _${r.category}_` : ''}`,
        ),
        card.rows.length > 10 ? `- … y ${card.rows.length - 10} más.` : '',
      ]
        .filter(Boolean)
        .join('\n')
  }
}
