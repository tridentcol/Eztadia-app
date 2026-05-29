'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { createRecurringRule } from '@/app/(app)/mi-plan/recurrentes/actions'
import { icons } from '@/lib/design/icons'
import { formatMoney } from '@/lib/currency/format'
import { cn } from '@/lib/utils'
import type { ProposedRecurring } from '@/lib/recurring/proposals'
import type { CurrencyCode } from '@/lib/currency/currencies'

type Props = {
  proposals: ProposedRecurring[]
}

function nextRunDate(dayOfMonth: number): string {
  const today = new Date()
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  const current = new Date(Date.UTC(year, month, dayOfMonth))
  if (current.getTime() <= Date.UTC(year, month, today.getUTCDate())) {
    current.setUTCMonth(month + 1)
  }
  return current.toISOString().slice(0, 10)
}

/**
 * Banner con propuestas detectadas automáticamente del histórico de
 * transacciones. Cada propuesta es un "Crear regla" de un solo click —
 * el motor ya sabe el monto promedio, la cuenta más usada, el día del mes
 * más frecuente y la categoría más común. Cero formulario.
 *
 * Si el usuario quiere ajustar antes de crear, puede dismiss y crear
 * manualmente con NewRecurringDialog.
 */
export function ProposedRecurringList({ proposals }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const Sparkle = icons.sparkles
  const Check = icons.check
  const X = icons.x

  const visible = proposals.filter((p) => !dismissed.has(p.merchant))
  if (visible.length === 0) return null

  function onCreate(p: ProposedRecurring) {
    startTransition(async () => {
      const result = await createRecurringRule({
        description: p.merchant,
        accountId: p.accountId,
        categoryId: p.categoryId,
        amount: p.avgAmount,
        currency: p.currency,
        kind: 'expense',
        frequency: 'monthly',
        dayOfMonth: p.dayOfMonth,
        dayOfWeek: null,
        nextRun: nextRunDate(p.dayOfMonth),
        autoCreate: true,
      })

      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success(`"${p.merchant}" registrado como regla mensual.`)
      setDismissed((prev) => new Set(prev).add(p.merchant))
      router.refresh()
    })
  }

  function onDismiss(merchant: string) {
    setDismissed((prev) => new Set(prev).add(merchant))
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkle
            strokeWidth={1.5}
            className="size-[14px]"
            style={{ color: 'var(--accent-ai)' }}
          />
          <h2 className="text-text text-sm font-semibold">
            Detecté patrones recurrentes
          </h2>
        </div>
        <span className="text-text-tertiary text-[11px] tabular">
          {visible.length} sugerencia{visible.length === 1 ? '' : 's'}
        </span>
      </div>

      <p className="text-text-tertiary max-w-prose text-[12px] leading-relaxed">
        Estos pagos se repiten en tu historial. Si los registrás como reglas,
        Finanzia los crea solos y los suma al cash flow.
      </p>

      <ul className="flex flex-col gap-2">
        {visible.map((p) => {
          return (
            <li
              key={p.merchant}
              className={cn(
                'border-border-default bg-surface flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-[12px] border p-4',
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-text truncate text-sm font-medium capitalize">
                  {p.merchant}
                </span>
                <span className="text-text-tertiary text-[11px]">
                  {p.occurrences} cargos · cada ~{p.avgIntervalDays} días ·
                  día {p.dayOfMonth} ·{' '}
                  {p.accountName}
                  {p.categoryName ? ` · ${p.categoryName}` : ''}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-text amount tabular text-sm">
                  {formatMoney(p.avgAmount, {
                    currency: p.currency as CurrencyCode,
                    compact: true,
                  })}
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onCreate(p)}
                  disabled={pending}
                >
                  <Check strokeWidth={1.5} className="size-3.5" />
                  Crear regla
                </Button>
                <button
                  type="button"
                  onClick={() => onDismiss(p.merchant)}
                  disabled={pending}
                  aria-label={`Descartar ${p.merchant}`}
                  className="text-text-tertiary hover:text-text -m-1 rounded-md p-1 transition-colors disabled:opacity-50"
                >
                  <X strokeWidth={1.5} className="size-3.5" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
