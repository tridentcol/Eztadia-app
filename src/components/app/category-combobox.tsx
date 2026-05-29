'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { icons } from '@/lib/design/icons'
import { cn } from '@/lib/utils'

type Option = { id: string; name: string }

type Props = {
  options: Option[]
  /** id seleccionado o '' para "sin categoría". */
  value: string
  onChange: (next: string) => void
  /** Label que se ve en el trigger cuando no hay seleccionado. */
  placeholder?: string
  /** Label especial para la opción "sin categoría". */
  emptyLabel?: string
  disabled?: boolean
}

/**
 * Select de categoría con buscador. Doble comportamiento por viewport:
 *
 * - Desktop (md+): el panel se monta sobrepuesto al form (position
 *   absolute desde el wrapper relative). No empuja contenido debajo.
 * - Mobile (<md): el panel se expande inline empujando el contenido —
 *   en mobile el dialog del form ya scrollea y los popovers sobre dialogs
 *   anidados causan bugs de touch.
 *
 * Filtrado: substring case-insensitive sobre name. Escape cierra, click
 * fuera cierra.
 *
 * iOS Safari: el input usa font-size 16px explícito para prevenir el
 * auto-zoom al focus (Safari hace zoom cuando el input tiene <16px).
 */
export function CategoryCombobox({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar',
  emptyLabel = 'Sin categorizar',
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const ChevronDown = icons['chevron-down']
  const Check = icons.check
  const Search = icons.search

  const selected = options.find((o) => o.id === value) ?? null
  const triggerLabel = selected?.name ?? (value === '' ? emptyLabel : placeholder)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.name.toLowerCase().includes(q))
  }, [options, query])

  // Click fuera cierra el panel.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (!wrapperRef.current) return
      if (wrapperRef.current.contains(e.target as Node)) return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function openPanel() {
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function closePanel() {
    setOpen(false)
    setQuery('')
  }

  function pick(id: string) {
    onChange(id)
    closePanel()
  }

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        className={cn(
          'border-border-default bg-surface hover:bg-surface-hover/60 flex h-10 w-full items-center justify-between gap-2 rounded-[8px] border px-3 text-sm outline-none transition-colors',
          'focus-visible:ring-accent-ai/40 focus-visible:ring-2',
          'disabled:opacity-50',
          value === '' && !selected ? 'text-text-tertiary' : 'text-text',
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          strokeWidth={1.5}
          className={cn(
            'text-text-tertiary size-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            'border-border-default bg-surface-elevated overflow-hidden rounded-[10px] border',
            // Desktop: sobrepuesto, no empuja el form.
            // Mobile: inline en flujo normal del form.
            'md:absolute md:top-full md:right-0 md:left-0 md:z-50 md:mt-1 md:shadow-xl',
          )}
        >
          <div className="border-border-default flex items-center gap-2 border-b px-3">
            <Search
              strokeWidth={1.5}
              className="text-text-tertiary size-[14px] shrink-0"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  closePanel()
                }
              }}
              placeholder="Buscar categoría…"
              aria-label="Buscar categoría"
              // text-[16px] previene el auto-zoom de iOS Safari al focus.
              // En md+ bajamos a text-sm que se ve más proporcional.
              className="text-text placeholder:text-text-tertiary flex-1 bg-transparent py-2.5 text-[16px] outline-none md:text-sm"
            />
          </div>

          <ul
            role="listbox"
            className={cn(
              'max-h-[280px] overflow-y-auto py-1',
              '[&::-webkit-scrollbar]:w-1.5',
              '[&::-webkit-scrollbar-thumb]:rounded-full',
              '[&::-webkit-scrollbar-thumb]:bg-[var(--border-emphasis)]',
              '[&::-webkit-scrollbar-track]:bg-transparent',
              '[scrollbar-width:thin]',
              '[scrollbar-color:var(--border-emphasis)_transparent]',
            )}
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === ''}
                onClick={() => pick('')}
                className="text-text-secondary hover:bg-surface-hover hover:text-text flex h-9 w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 text-sm outline-none transition-colors"
              >
                <span className="flex-1 truncate text-left italic">
                  {emptyLabel}
                </span>
                {value === '' && (
                  <Check
                    strokeWidth={2}
                    className="size-[14px] shrink-0"
                    style={{ color: 'var(--purple-base)' }}
                  />
                )}
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="text-text-tertiary px-3 py-4 text-center text-[13px]">
                Sin resultados.
              </li>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.id === value
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => pick(opt.id)}
                      className="text-text-secondary hover:bg-surface-hover hover:text-text flex h-9 w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 text-sm outline-none transition-colors"
                    >
                      <span className="flex-1 truncate text-left">
                        {opt.name}
                      </span>
                      {isSelected && (
                        <Check
                          strokeWidth={2}
                          className="size-[14px] shrink-0"
                          style={{ color: 'var(--purple-base)' }}
                        />
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
