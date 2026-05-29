import type { BarRow } from '@/lib/copilot/render/answer-ast'

/**
 * Barras horizontales comparativas. CSS puro (más nítido a tamaño chico que
 * un canvas y coherente con el patrón barra+lista). Escala monocromática.
 */
export function BarsBlock({
  title,
  max,
  rows,
}: {
  title: string
  max: number
  rows: BarRow[]
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
        {title}
      </span>
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={`${r.label}-${i}`} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-text-secondary text-[13px]">{r.label}</span>
              <span className="text-text amount tabular text-[13px]">{r.value}</span>
            </div>
            <div className="bg-surface-hover h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${max > 0 ? Math.max(2, (r.raw / max) * 100) : 0}%`,
                  backgroundColor: 'var(--text)',
                  opacity: 0.85 - Math.min(i, 4) * 0.12,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
