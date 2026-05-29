import { cn } from '@/lib/utils'
import type { ListItem, Tone } from '@/lib/copilot/render/answer-ast'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'text-text',
  positive: 'text-positive',
  negative: 'text-negative',
  warning: 'text-warning',
}

export function ListBlock({ title, items }: { title?: string; items: ListItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
          {title}
        </span>
      )}
      <ul className="flex flex-col">
        {items.map((it, i) => (
          <li
            key={it.id ?? `${it.primary}-${i}`}
            className="border-border-default/60 flex items-baseline justify-between gap-3 border-b py-2 last:border-b-0"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-text truncate text-[13px]">{it.primary}</span>
              {it.secondary && (
                <span className="text-text-tertiary truncate text-[11px]">{it.secondary}</span>
              )}
            </div>
            {it.trailing && (
              <span
                className={cn(
                  'amount tabular shrink-0 text-[13px]',
                  TONE_CLASS[it.trailingTone ?? 'neutral'],
                )}
              >
                {it.trailing}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
