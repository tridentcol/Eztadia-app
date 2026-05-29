import type { Metadata } from 'next'
import Link from 'next/link'
import { eq } from 'drizzle-orm'

import { requireCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { profiles } from '@/lib/db/schema'
import {
  listMerchantsForUser,
  resolveRange,
  type MerchantsRange,
} from '@/lib/db/queries/merchants'
import { Amount } from '@/components/app/amount'
import { EmptyState } from '@/components/app/empty-state'
import { formatMoney } from '@/lib/currency/format'
import { cn } from '@/lib/utils'
import type { CurrencyCode } from '@/lib/currency/currencies'

export const metadata: Metadata = {
  title: 'Comercios',
}

type SearchParams = Promise<{ scope?: string }>

const SCOPES: Array<{ value: MerchantsRange['scope']; label: string }> = [
  { value: 'this-month', label: 'Este mes' },
  { value: 'this-year', label: 'Este año' },
]

function isScope(v: string | undefined): v is MerchantsRange['scope'] {
  return v === 'this-month' || v === 'this-year'
}

export default async function ComerciosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await requireCurrentUser()
  const params = await searchParams
  const scope = isScope(params.scope) ? params.scope : 'this-month'
  const range = resolveRange(scope)

  const [profile, merchants] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(profiles.userId, user.id) }),
    listMerchantsForUser(user.id, range, { limit: 40 }),
  ])
  const baseCurrency = (profile?.baseCurrency ?? 'COP') as CurrencyCode

  const total = merchants.reduce((acc, m) => acc + Number.parseFloat(m.totalBase), 0)
  const maxAmount = Math.max(1, ...merchants.map((m) => Number.parseFloat(m.totalBase)))

  return (
    <div className="flex min-w-0 flex-col gap-10 lg:gap-12">
      <header className="flex min-w-0 flex-col gap-1.5">
        <p className="text-text-secondary text-sm">Comercios</p>
        <h1 className="editorial text-text text-3xl italic capitalize sm:text-4xl">
          Dónde se fue tu dinero
        </h1>
        <p className="text-text-tertiary mt-1 max-w-prose text-[13px]">
          Agrupado por comercio. Útil para ver patrones — un solo lugar
          donde puedes preguntarte si {' '}
          <span className="text-text-secondary">cuánto le di a Netflix</span>{' '}
          es lo que esperabas.
        </p>
      </header>

      <nav
        aria-label="Período"
        className="border-border-default -mx-1 flex items-center gap-1 self-start overflow-x-auto rounded-[8px] border p-0.5"
      >
        {SCOPES.map((s) => {
          const selected = s.value === scope
          return (
            <Link
              key={s.value}
              href={`/mi-historia/comercios?scope=${s.value}`}
              className={cn(
                'rounded-[6px] px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors',
                selected
                  ? 'bg-surface-hover text-text'
                  : 'text-text-secondary hover:text-text hover:bg-surface-hover/60',
              )}
            >
              {s.label}
            </Link>
          )
        })}
      </nav>

      {merchants.length === 0 ? (
        <EmptyState
          headline="No hay gastos en este período todavía."
          body={`Cuando registres movimientos en ${range.label.toLowerCase()}, aparecerán agrupados por comercio acá.`}
        />
      ) : (
        <>
          <div className="border-border-default bg-surface flex flex-wrap items-center justify-between gap-3 rounded-[12px] border p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
                Total · {range.label}
              </span>
              <Amount
                value={total.toFixed(2)}
                currency={baseCurrency}
                kind="neutral"
                className="text-2xl"
              />
            </div>
            <span className="text-text-tertiary text-[12px]">
              {merchants.length} {merchants.length === 1 ? 'comercio' : 'comercios'}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {merchants.map((m) => {
              const amount = Number.parseFloat(m.totalBase)
              const widthPct = Math.max(2, (amount / maxAmount) * 100)
              const pctOfTotal = total > 0 ? Math.round((amount / total) * 100) : 0
              return (
                <li
                  key={m.slug}
                  className="border-border-default bg-surface flex min-w-0 flex-col gap-3 rounded-[12px] border p-4"
                >
                  <div className="flex min-w-0 items-baseline justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        href={`/mi-dinero/movimientos?merchant=${encodeURIComponent(m.slug)}`}
                        className="text-text hover:text-text-secondary truncate text-sm font-medium capitalize transition-colors"
                      >
                        {m.name}
                      </Link>
                      <span className="text-text-tertiary text-[11px]">
                        {m.count} {m.count === 1 ? 'movimiento' : 'movimientos'}
                        {m.categoryName ? ` · ${m.categoryName}` : ''}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-text amount tabular text-sm">
                        {formatMoney(amount, { currency: baseCurrency, compact: true })}
                      </span>
                      <span className="text-text-tertiary text-[11px] tabular">
                        {pctOfTotal}% del total
                      </span>
                    </div>
                  </div>
                  <div className="bg-surface-hover h-1 overflow-hidden rounded-full">
                    <div
                      aria-hidden
                      className="h-full rounded-full"
                      style={{
                        width: `${widthPct}%`,
                        background: 'var(--purple-base)',
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
