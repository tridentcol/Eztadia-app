import type { BudgetStatus } from '@/lib/copilot/render/answer-ast'

const STATUS_COLOR: Record<BudgetStatus, string> = {
  safe: 'var(--positive)',
  warning: 'var(--warning)',
  exceeded: 'var(--negative)',
}

/**
 * Barra de presupuesto: segmento gastado coloreado por estado, con la marca
 * del límite al 100%. El relleno se topa visualmente en 100% aunque el
 * porcentaje real lo exceda (el color negativo ya comunica el sobregiro).
 */
export function GaugeBlock({
  label,
  spent,
  limit,
  percent,
  status,
}: {
  label: string
  spent: string
  limit: string
  percent: number
  status: BudgetStatus
}) {
  const fill = Math.max(0, Math.min(1, percent)) * 100
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-text text-[13px]">{label}</span>
        <span className="text-text-tertiary amount tabular text-[12px]">
          {Math.round(percent * 100)}%
        </span>
      </div>
      <div className="bg-surface-hover relative h-2 w-full overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${fill}%`, backgroundColor: STATUS_COLOR[status] }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-text-secondary amount tabular text-[12px]">{spent}</span>
        <span className="text-text-tertiary amount tabular text-[12px]">de {limit}</span>
      </div>
    </div>
  )
}
