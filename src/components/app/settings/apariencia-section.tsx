'use client'

import { useTheme, type Theme } from '@/components/app/theme-provider'
import { icons } from '@/lib/design/icons'
import { cn } from '@/lib/utils'

type Option = {
  value: Theme
  label: string
  description: string
}

const OPTIONS: Option[] = [
  {
    value: 'dark',
    label: 'Oscuro',
    description: 'Horizonte sobre el morado profundo de la marca. Recomendado.',
  },
  {
    value: 'light',
    label: 'Claro',
    description: 'Paper sobre warm-grey, acentos morados sutiles.',
  },
]

export function AparienciaSection() {
  const { theme, setTheme } = useTheme()
  const Check = icons.check

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const selected = opt.value === theme
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              aria-pressed={selected}
              className={cn(
                'flex min-h-[112px] flex-col items-start gap-2 rounded-[12px] border p-4 text-left transition-colors',
                selected
                  ? 'border-border-emphasis bg-surface-hover'
                  : 'border-border-default bg-surface hover:bg-surface-hover/60',
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-text text-sm font-semibold">
                  {opt.label}
                </span>
                {selected && (
                  <Check
                    strokeWidth={2}
                    className="size-4"
                    style={{ color: 'var(--purple-base)' }}
                  />
                )}
              </div>
              <span className="text-text-secondary text-[12px] leading-relaxed">
                {opt.description}
              </span>
              <div className="mt-auto flex w-full gap-1.5">
                <ThemePreview kind={opt.value} />
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-text-tertiary text-[12px]">
        Tu preferencia se guarda en este dispositivo. Cambia cuando quieras.
      </p>
    </div>
  )
}

function ThemePreview({ kind }: { kind: Theme }) {
  // Mini-paleta para que el usuario vea cómo se ve antes de aplicar.
  const swatches =
    kind === 'dark'
      ? ['#15102A', '#1C1739', '#A78BFA', '#F5F0FF']
      : ['#FAFAFC', '#F2EDFF', '#DDD6FE', '#15102A']
  return (
    <>
      {swatches.map((hex) => (
        <span
          key={hex}
          aria-hidden
          className="h-5 flex-1 rounded-[4px]"
          style={{ background: hex }}
        />
      ))}
    </>
  )
}
