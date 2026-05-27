import { Amount } from '@/components/app/amount'
import { icons, type IconName } from '@/lib/design/icons'
import { formatMoney } from '@/lib/currency/format'
import type {
  ExpensesByParentEntry,
  ExpensesByParentResult,
} from '@/lib/db/queries/expenses-by-parent'
import type { CurrencyCode } from '@/lib/currency/currencies'

/**
 * Familia de morados ordenada por intensidad. Las categorías con mayor gasto
 * reciben los tonos más profundos; las demás van descendiendo. Cuando hay más
 * categorías que tonos, las residuales comparten el último tono.
 */
const PURPLE_SCALE = [
  '#4C1D95', // purple-deep
  '#6D28D9', // purple-mid
  '#7C3AED', // purple-base
  '#8B5CF6',
  '#A78BFA', // purple-light
  '#DDD6FE', // purple-pale
] as const

function toneFor(index: number): string {
  return PURPLE_SCALE[Math.min(index, PURPLE_SCALE.length - 1)]!
}

const monthLabels: Record<string, string> = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
}

function periodToLabel(period: string): string {
  const [year, month] = period.split('-')
  const label = monthLabels[month ?? ''] ?? period
  return `${label} ${year ?? ''}`.trim()
}

type Props = {
  data: ExpensesByParentResult
  currency: CurrencyCode
}

export function CategoryBreakdown({ data, currency }: Props) {
  if (data.entries.length === 0) return null

  const total = Number.parseFloat(data.grandTotal)
  const period = periodToLabel(data.period)
  const entries = data.entries.map((e, i) => ({
    ...e,
    pct: total > 0 ? Number.parseFloat(e.totalBase) / total : 0,
    tone: toneFor(i),
  }))

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-text text-sm font-semibold">
            Gastos por categoría
          </h2>
          <p className="text-text-tertiary text-[12px]">
            {period} · {entries.length}{' '}
            {entries.length === 1 ? 'categoría' : 'categorías'}
          </p>
        </div>
        <Amount
          value={data.grandTotal}
          currency={currency}
          kind="neutral"
          className="text-xl shrink-0"
        />
      </header>

      {/* Barra apilada — un segmento por categoría padre, tonos morados */}
      <div
        role="img"
        aria-label={`Distribución de gastos por categoría: ${entries
          .map((e) => `${e.parentName} ${Math.round(e.pct * 100)}%`)
          .join(', ')}`}
        className="bg-surface-hover flex h-2.5 w-full overflow-hidden rounded-full"
      >
        {entries.map((e) => (
          <span
            key={e.parentId}
            aria-hidden
            className="h-full"
            style={{
              width: `${e.pct * 100}%`,
              background: e.tone,
            }}
          />
        ))}
      </div>

      {/* Lista editorial */}
      <ul className="border-border-default bg-surface flex flex-col rounded-[12px] border">
        {entries.map((e, idx) => (
          <CategoryRow
            key={e.parentId}
            entry={e}
            currency={currency}
            isLast={idx === entries.length - 1}
          />
        ))}
      </ul>
    </section>
  )
}

function CategoryRow({
  entry,
  currency,
  isLast,
}: {
  entry: ExpensesByParentEntry & { pct: number; tone: string }
  currency: CurrencyCode
  isLast: boolean
}) {
  const Icon = icons[entry.parentIcon as IconName] ?? icons.tag
  return (
    <li
      className={`flex items-center justify-between gap-4 px-5 py-3 ${
        isLast ? '' : 'border-border-default/60 border-b'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ background: entry.tone }}
        />
        <Icon
          strokeWidth={1.5}
          className="text-text-tertiary h-4 w-4 shrink-0"
        />
        <span className="text-text truncate text-sm">{entry.parentName}</span>
      </div>
      <div className="flex shrink-0 items-baseline gap-4">
        <span className="text-text-tertiary text-[12px] tabular w-10 text-right">
          {Math.round(entry.pct * 100)}%
        </span>
        <span className="text-text text-sm tabular">
          {formatMoney(entry.totalBase, { currency })}
        </span>
      </div>
    </li>
  )
}
