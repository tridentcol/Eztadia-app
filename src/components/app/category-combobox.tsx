'use client'

import { useMemo, useRef, useState } from 'react'

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
 * Select de categoría con buscador inline. La lista se expande dentro del
 * form (no usa Portal/Popover) para evitar bugs de scroll y posicionamiento
 * en mobile/dialogs anidados:
 *
 * - Wheel scroll funciona nativamente — la lista vive en el flujo normal del
 *   form, sin overlay que intercepte eventos.
 * - En mobile el input + lista siempre se ven; el form padre maneja overflow
 *   con su propio scroll.
 * - Sin Portal — sin issues de z-index ni de touch events que se pierden.
 *
 * Filtrado: substring case-insensitive sobre name. Tab/Escape cierra.
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

  function openPanel() {
    setOpen(true)
    setQuery('')
    // Focus al input justo después de mount.
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
    <div className="flex flex-col gap-1">
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
          className="border-border-default bg-surface-elevated overflow-hidden rounded-[10px] border"
          // Stop event propagation so clicks/touches dentro del panel no
          // disparen comportamientos del Dialog padre.
          onMouseDown={(e) => e.stopPropagation()}
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
              className="text-text placeholder:text-text-tertiary flex-1 bg-transparent py-2.5 text-sm outline-none"
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
