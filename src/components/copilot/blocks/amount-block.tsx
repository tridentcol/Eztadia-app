import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/copilot/render/answer-ast'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'text-text',
  positive: 'text-positive',
  negative: 'text-negative',
  warning: 'text-warning',
}

export function AmountBlock({
  label,
  value,
  tone = 'neutral',
  delta,
  note,
}: {
  label: string
  value: string
  tone?: Tone
  delta?: { value: string; since: string; tone?: Tone }
  note?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={cn('amount tabular text-[28px] leading-none sm:text-[32px]', TONE_CLASS[tone])}>
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'amount tabular text-[12px]',
              TONE_CLASS[delta.tone ?? 'neutral'],
            )}
          >
            {delta.value}
            <span className="text-text-tertiary"> {delta.since}</span>
          </span>
        )}
      </div>
      {note && <span className="text-text-tertiary text-[12px]">{note}</span>}
    </div>
  )
}
