import type { BreakdownRow } from '@/lib/copilot/render/answer-ast'

/**
 * Barra horizontal segmentada (full-width) + lista debajo con monto y %.
 * Sin color saturado: los segmentos alternan opacidades del text para crear
 * jerarquía monocromática. Patrón editorial barra+lista del cash-flow.
 */
export function BreakdownBlock({
  title,
  rows,
  total,
}: {
  title: string
  rows: BreakdownRow[]
  total?: { label: string; value: string }
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
        {title}
      </span>

      <div className="bg-surface-hover flex h-1.5 w-full overflow-hidden rounded-full">
        {rows.map((r, i) => (
          <div
            key={`${r.label}-${i}`}
            className="h-full"
            style={{
              width: `${Math.max(0, Math.min(1, r.fraction)) * 100}%`,
              backgroundColor: 'var(--text)',
              opacity: 0.85 - Math.min(i, 6) * 0.11,
            }}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <li key={`${r.label}-row-${i}`} className="flex items-baseline justify-between gap-3">
            <span className="text-text-secondary flex-1 truncate text-[13px]">
              {r.label}
              {r.sub && <span className="text-text-tertiary text-[11px]"> · {r.sub}</span>}
            </span>
            <span className="text-text-tertiary amount tabular text-[11px]">
              {Math.round(r.fraction * 100)}%
            </span>
            <span className="text-text amount tabular w-[96px] text-right text-[13px]">
              {r.value}
            </span>
          </li>
        ))}
      </ul>

      {total && (
        <div className="border-border-default flex items-baseline justify-between gap-3 border-t pt-2">
          <span className="text-text-tertiary text-[12px]">{total.label}</span>
          <span className="text-text amount tabular text-[13px] font-medium">{total.value}</span>
        </div>
      )}
    </div>
  )
}
