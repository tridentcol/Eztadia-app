'use client'

import { useState, type ReactNode } from 'react'

import { icons } from '@/lib/design/icons'
import { cn } from '@/lib/utils'

type Props = {
  id: string
  label: string
  description: string
  /** Si true, arranca abierta en mobile (útil si es la que matchea el
   *  anchor de la URL). En desktop siempre se muestra. */
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * Sección de Ajustes que adapta su forma según viewport:
 * - Mobile/tablet (<lg): trigger button colapsable estilo iOS Settings —
 *   tap el header expande/colapsa el contenido. Sólo una abierta a la vez
 *   funciona bien para descubrimiento.
 * - Desktop (lg+): header con border-bottom + contenido siempre visible,
 *   como antes.
 *
 * Children sólo se renderizan una vez — el header es lo que cambia.
 */
export function ResponsiveSettingsSection({
  id,
  label,
  description,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const ChevronDown = icons['chevron-down']

  return (
    <section
      id={id}
      aria-label={label}
      className="border-border-default scroll-mt-[80px] overflow-hidden rounded-[12px] border lg:rounded-none lg:border-0"
    >
      {/* Mobile trigger — compact, tappable, accordion behavior */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className={cn(
          'bg-surface hover:bg-surface-hover/60 flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors lg:hidden',
          open && 'bg-surface-hover/40',
        )}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-text text-[15px] font-semibold">{label}</span>
          <span className="text-text-tertiary text-[12px]">{description}</span>
        </div>
        <ChevronDown
          strokeWidth={1.5}
          className={cn(
            'text-text-tertiary size-5 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Desktop header — siempre visible en lg+ */}
      <header className="border-border-default/60 hidden flex-col gap-0.5 border-b pb-3 lg:flex">
        <h2 className="text-text text-base font-semibold">{label}</h2>
        <p className="text-text-tertiary text-[12px]">{description}</p>
      </header>

      {/* Panel — en lg+ siempre visible, en mobile depende de open */}
      <div
        id={`${id}-panel`}
        className={cn(
          'border-border-default border-t lg:mt-5 lg:border-t-0',
          !open && 'hidden lg:block',
        )}
      >
        <div className="p-4 lg:p-0">{children}</div>
      </div>
    </section>
  )
}
