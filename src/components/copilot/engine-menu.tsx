'use client'

import { DropdownMenu } from 'radix-ui'

import { icons } from '@/lib/design/icons'
import type { CopilotChoice } from '@/app/(app)/copilot/actions'

/**
 * Selector discreto del motor del copiloto, integrado en el header como el badge
 * mismo. Muestra la selección actual (Local o el modelo) con un punto lavanda
 * (accent-ai) cuando es IA. Al abrir lista Local + los modelos cuyo proveedor
 * tiene key integrada. Minimalista, on-brand.
 */
export function CopilotEngineMenu({
  options,
  value,
  onSelect,
}: {
  options: CopilotChoice[]
  value: string
  onSelect: (value: string) => void
}) {
  const Chevron = icons['chevron-down']
  const Check = icons.check

  const selected = options.find((o) => o.value === value)
  const label = selected?.label ?? (value === 'local' ? 'Local' : value)
  const isLLM = value !== 'local'

  const local = options.find((o) => o.kind === 'local')
  const models = options.filter((o) => o.kind === 'model')

  function item(o: CopilotChoice) {
    const active = o.value === value
    return (
      <DropdownMenu.Item
        key={o.value}
        onSelect={() => onSelect(o.value)}
        className="text-text data-[highlighted]:bg-surface-hover flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] outline-none"
      >
        <Check
          strokeWidth={2}
          className={`size-3.5 shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`}
          style={{ color: 'var(--accent-ai)' }}
        />
        <span className="truncate">{o.label}</span>
      </DropdownMenu.Item>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Elegir el motor del copiloto"
          title={isLLM ? `Modelo: ${label}` : 'Motor local (sin IA)'}
          className="text-text-tertiary hover:text-text data-[state=open]:text-text flex min-h-11 min-w-0 items-center gap-1 rounded-[6px] px-1.5 text-[11px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ai)]/40"
        >
          <span
            className={`size-1.5 shrink-0 rounded-full ${isLLM ? 'bg-accent-ai' : 'bg-text-tertiary'}`}
            aria-hidden
          />
          <span className="min-w-0 truncate">{label}</span>
          <Chevron strokeWidth={1.5} className="size-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="start"
          className="border-border-default bg-surface-elevated z-[60] flex min-w-[180px] flex-col gap-0.5 rounded-[12px] border p-1 shadow-xl"
        >
          {local && item(local)}
          {models.length > 0 && (
            <DropdownMenu.Separator className="bg-border-default my-1 h-px" />
          )}
          {models.map(item)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
