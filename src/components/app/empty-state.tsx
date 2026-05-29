import type { LucideIcon } from 'lucide-react'

/**
 * Empty state editorial — regla 14 del mandato.
 * Tipografía Fraunces italic en el headline, Inter en el body, sin ilustración.
 *
 * El `icon` opcional es sutil (size 32-40px, stroke 1.5, text-tertiary) — sólo
 * un acento, nunca el protagonista. El protagonista es el copy.
 */

type EmptyStateProps = {
  headline: string
  body: string
  action?: React.ReactNode
  icon?: LucideIcon
}

export function EmptyState({ headline, body, action, icon: Icon }: EmptyStateProps) {
  return (
    <section className="border-border-default bg-surface flex flex-col items-start gap-5 rounded-[12px] border p-10">
      {Icon && (
        <Icon
          strokeWidth={1.5}
          className="text-text-tertiary size-8 shrink-0"
          aria-hidden
        />
      )}
      <p className="editorial text-text text-2xl leading-tight">{headline}</p>
      <p className="text-text-secondary max-w-md text-sm leading-relaxed">
        {body}
      </p>
      {action ? <div className="pt-2">{action}</div> : null}
    </section>
  )
}
