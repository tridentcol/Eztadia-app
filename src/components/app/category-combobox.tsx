'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { icons } from '@/lib/design/icons'
import { cn } from '@/lib/utils'

type Option = {
  id: string
  name: string
  /** Texto secundario opcional — útil para mostrar contexto (tipo de
   *  cuenta, moneda, etc.) sin perder la jerarquía del nombre. */
  subtitle?: string
}

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
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const ChevronDown = icons['chevron-down']
  const Check = icons.check
  const Search = icons.search

  const selected = options.find((o) => o.id === value) ?? null
  const triggerLabel = selected?.name ?? (value === '' ? emptyLabel : placeholder)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      if (o.name.toLowerCase().includes(q)) return true
      if (o.subtitle?.toLowerCase().includes(q)) return true
      return false
    })
  }, [options, query])

  // Lista unificada para navegación por teclado: '' (sin categoría) + filtradas.
  const navOptions = useMemo(() => ['', ...filtered.map((o) => o.id)], [filtered])
  const activeId = navOptions[activeIndex] ?? ''
  const optionDomId = (id: string) => `${listboxId}-opt-${id || 'none'}`

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

  // Mantiene visible la opción activa durante la navegación por teclado.
  useEffect(() => {
    if (!open) return
    document
      .getElementById(optionDomId(activeId))
      ?.scrollIntoView({ block: 'nearest' })
    // optionDomId/activeId derivan de listboxId+activeIndex; basta con estos deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open, navOptions])

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      closePanel()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, navOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(navOptions.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const id = navOptions[activeIndex]
      if (id !== undefined) pick(id)
    }
  }

  function openPanel() {
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
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
              onChange={(e) => {
                setQuery(e.target.value)
                // Filtrar reposiciona el resaltado en la primera opción.
                setActiveIndex(0)
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Buscar…"
              aria-label="Buscar categoría"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={optionDomId(activeId)}
              // text-[16px] previene el auto-zoom de iOS Safari al focus.
              // En md+ bajamos a text-sm que se ve más proporcional.
              className="text-text placeholder:text-text-tertiary flex-1 bg-transparent py-2.5 text-[16px] outline-none md:text-sm"
            />
          </div>

          <ul
            id={listboxId}
            role="listbox"
            aria-label="Categorías"
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
                id={optionDomId('')}
                role="option"
                aria-selected={value === ''}
                onClick={() => pick('')}
                onPointerMove={() => setActiveIndex(0)}
                className={cn(
                  'text-text-secondary hover:bg-surface-hover hover:text-text flex h-9 w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 text-sm outline-none transition-colors',
                  activeId === '' && 'bg-surface-hover text-text',
                )}
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
              filtered.map((opt, idx) => {
                const isSelected = opt.id === value
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      id={optionDomId(opt.id)}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => pick(opt.id)}
                      onPointerMove={() => setActiveIndex(idx + 1)}
                      className={cn(
                        'text-text-secondary hover:bg-surface-hover hover:text-text flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 py-1.5 text-sm outline-none transition-colors',
                        activeId === opt.id && 'bg-surface-hover text-text',
                      )}
                    >
                      <span className="flex min-w-0 flex-1 flex-col text-left">
                        <span className="text-text truncate text-[14px]">
                          {opt.name}
                        </span>
                        {opt.subtitle && (
                          <span className="text-text-tertiary truncate text-[11px]">
                            {opt.subtitle}
                          </span>
                        )}
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
