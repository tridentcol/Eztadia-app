import { cn } from '@/lib/utils'
import type { TimelineItem, Tone } from '@/lib/copilot/render/answer-ast'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'text-text',
  positive: 'text-positive',
  negative: 'text-negative',
  warning: 'text-warning',
}

/** Timeline vertical de próximos eventos: punto + fecha + concepto + monto. */
export function EventListBlock({ items }: { items: TimelineItem[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((it, i) => (
        <li key={it.id ?? `${it.primary}-${i}`} className="flex items-start gap-3 py-2">
          <span className="mt-1.5 flex flex-col items-center self-stretch">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: 'var(--border-emphasis)' }}
              aria-hidden
            />
          </span>
          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-text truncate text-[13px]">{it.primary}</span>
              <span className="text-text-tertiary amount tabular text-[11px]">{it.dateLabel}</span>
            </div>
            <span className={cn('amount tabular shrink-0 text-[13px]', TONE_CLASS[it.tone ?? 'neutral'])}>
              {it.amount}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
