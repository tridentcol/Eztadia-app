import { icons } from '@/lib/design/icons'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/copilot/render/answer-ast'

/**
 * Callout de consejo del motor heurístico. Sobrio: borde izquierdo 1px e icono
 * lucide según tono. NO usa accent-ai (reservado a presencia de IA; esto es
 * heurístico). Tono con la paleta semántica Noir, sin saturación ni glow.
 */
const TONE: Record<Tone, { icon: keyof typeof icons; color: string }> = {
  neutral: { icon: 'circle-dot', color: 'var(--text-secondary)' },
  positive: { icon: 'trending-up', color: 'var(--positive)' },
  negative: { icon: 'alert-circle', color: 'var(--negative)' },
  warning: { icon: 'alert-triangle', color: 'var(--warning)' },
}

export function AdviceBlock({
  tone,
  title,
  body,
}: {
  tone: Tone
  title: string
  body: string
}) {
  const meta = TONE[tone]
  const Icon = icons[meta.icon]
  return (
    <div
      className={cn(
        'border-border-emphasis flex gap-2.5 border-l-2 py-1.5 pl-3',
      )}
    >
      <Icon
        strokeWidth={1.5}
        className="mt-0.5 size-4 shrink-0"
        style={{ color: meta.color }}
        aria-hidden
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-text text-[13px] font-medium">{title}</span>
        <span className="text-text-secondary text-[13px] leading-relaxed">{body}</span>
      </div>
    </div>
  )
}
