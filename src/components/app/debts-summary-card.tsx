import Link from 'next/link'

import { Amount } from '@/components/app/amount'
import { icons } from '@/lib/design/icons'
import type { CurrencyCode } from '@/lib/currency/currencies'
import type { DebtsSummary } from '@/lib/db/queries/debts'

type Props = {
  summary: DebtsSummary
  /** Deuda total de tarjetas (en base currency, sumada aparte). */
  creditCardDebtInBase: number
  currency: CurrencyCode
}

function daysUntilLabel(dateIso: string): string {
  const target = new Date(`${dateIso}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diff < 0) return 'vencido'
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  return `en ${diff} días`
}

export function DebtsSummaryCard({
  summary,
  creditCardDebtInBase,
  currency,
}: Props) {
  const debtsTotal = Number.parseFloat(summary.totalBalanceInBase)
  const grandTotal = debtsTotal + creditCardDebtInBase

  // No mostrar el widget si no hay nada que reportar.
  if (grandTotal <= 0 && summary.activeCount === 0) return null

  const Landmark = icons.landmark
  const ChevronRight = icons['chevron-right']

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-text text-sm font-semibold">Tu deuda</h2>
        <Link
          href="/mi-dinero/deudas"
          className="text-text-secondary hover:text-text text-[13px] transition-colors"
        >
          Ver detalle
        </Link>
      </header>

      <article
        className="border-border-default flex flex-col gap-5 rounded-[12px] border p-5"
        style={{
          background:
            'color-mix(in oklab, var(--brand-purple-strong) 6%, transparent)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-md"
              style={{
                background:
                  'color-mix(in oklab, var(--brand-purple-strong) 18%, transparent)',
                color: 'var(--brand-purple-soft)',
              }}
            >
              <Landmark strokeWidth={1.5} className="h-4 w-4" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
                Saldo total adeudado
              </span>
              <Amount
                value={grandTotal.toFixed(2)}
                currency={currency}
                kind="neutral"
                className="text-2xl sm:text-3xl"
              />
              <span className="text-text-tertiary text-[11px]">
                {summary.activeCount > 0 && (
                  <>
                    {summary.activeCount}{' '}
                    {summary.activeCount === 1 ? 'préstamo' : 'préstamos'}
                  </>
                )}
                {summary.activeCount > 0 && creditCardDebtInBase > 0 && ' · '}
                {creditCardDebtInBase > 0 && 'incluye tarjetas'}
                {summary.partial && ' · conversión parcial'}
              </span>
            </div>
          </div>
        </div>

        {summary.nextPayment && (
          <div className="border-border-default/60 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
                Próximo pago
              </span>
              <span className="text-text truncate text-sm">
                {summary.nextPayment.debtName}
              </span>
              <span className="text-text-secondary text-[12px]">
                {summary.nextPayment.date} ·{' '}
                {daysUntilLabel(summary.nextPayment.date)}
              </span>
            </div>
            {summary.nextPayment.amount && (
              <Amount
                value={summary.nextPayment.amount}
                currency={summary.nextPayment.currency as CurrencyCode}
                kind="neutral"
                className="text-base"
              />
            )}
          </div>
        )}

        <Link
          href="/mi-dinero/deudas"
          className="text-text-secondary hover:text-text inline-flex items-center gap-1 self-start text-[13px] transition-colors"
        >
          Gestionar deudas
          <ChevronRight strokeWidth={1.5} className="size-3.5" />
        </Link>
      </article>
    </section>
  )
}
