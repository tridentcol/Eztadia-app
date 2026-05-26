import type { Metadata } from 'next'
import Link from 'next/link'

import { requireCurrentUser } from '@/lib/auth'
import {
  listTransactionsForUser,
  type TransactionFilters,
} from '@/lib/db/queries/transactions'
import { EmptyState } from '@/components/app/empty-state'
import { Amount } from '@/components/app/amount'
import { NewTransactionTrigger } from '@/components/app/new-transaction-trigger'
import { cn } from '@/lib/utils'
import { icons } from '@/lib/design/icons'

export const metadata: Metadata = {
  title: 'Transacciones',
}

type SearchParams = Promise<{
  kind?: string
  accountId?: string
}>

const kindFilters: Array<{
  value: TransactionFilters['kind'] | null
  label: string
}> = [
  { value: null, label: 'Todas' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'transfer', label: 'Transferencias' },
]

function kindParam(value: TransactionFilters['kind'] | null): string {
  if (!value) return ''
  return `?kind=${value}`
}

const kindToTone: Record<
  'income' | 'expense' | 'transfer',
  'positive' | 'negative' | 'neutral'
> = {
  income: 'positive',
  expense: 'negative',
  transfer: 'neutral',
}

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await requireCurrentUser()
  const params = await searchParams

  const kind = (() => {
    if (params.kind === 'income' || params.kind === 'expense' || params.kind === 'transfer') {
      return params.kind
    }
    return undefined
  })()

  const list = await listTransactionsForUser(user.id, {
    kind,
    accountId: params.accountId,
    limit: 200,
  })

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-text-secondary text-sm">Transacciones</p>
          <h1 className="text-text text-3xl font-semibold tracking-[-0.02em]">
            Bitácora
          </h1>
        </div>
        <NewTransactionTrigger />
      </header>

      <nav
        aria-label="Filtros"
        className="border-border-default flex items-center gap-1 rounded-[8px] border p-0.5 self-start"
      >
        {kindFilters.map((f) => {
          const selected = (f.value ?? null) === (kind ?? null)
          return (
            <Link
              key={f.label}
              href={`/transacciones${kindParam(f.value)}`}
              className={cn(
                'rounded-[6px] px-3 py-1.5 text-[13px] transition-colors',
                selected
                  ? 'bg-surface-hover text-text'
                  : 'text-text-secondary hover:text-text hover:bg-surface-hover/60',
              )}
            >
              {f.label}
            </Link>
          )
        })}
      </nav>

      {list.length === 0 ? (
        <EmptyState
          headline={
            kind
              ? 'No hay movimientos para este filtro.'
              : 'Sin movimientos para mostrar.'
          }
          body="Cuando importes un extracto o registres un gasto manualmente, lo verás aquí. Multi-divisa, ordenado, categorizable."
          action={<NewTransactionTrigger />}
        />
      ) : (
        <div className="border-border-default bg-surface overflow-hidden rounded-[12px] border">
          <table className="w-full">
            <thead>
              <tr className="border-border-default text-text-tertiary border-b text-[11px] uppercase tracking-[0.08em]">
                <th className="px-5 py-3 text-left font-medium">Fecha</th>
                <th className="px-5 py-3 text-left font-medium">Descripción</th>
                <th className="px-5 py-3 text-left font-medium">Cuenta</th>
                <th className="px-5 py-3 text-left font-medium">Categoría</th>
                <th className="px-5 py-3 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {list.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-border-default/60 hover:bg-surface-hover/60 border-b transition-colors last:border-b-0"
                >
                  <td className="text-text-secondary tabular px-5 py-3.5 text-[13px]">
                    {formatRelativeDate(tx.date)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-text text-sm">{tx.description}</span>
                      {tx.kind === 'transfer' && tx.transferAccount && (
                        <span className="text-text-tertiary text-[11px]">
                          {tx.account.name} → {tx.transferAccount.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-text-secondary px-5 py-3.5 text-sm">
                    {tx.account.name}
                  </td>
                  <td className="px-5 py-3.5">
                    {tx.category ? (
                      <span className="text-text-secondary text-sm">
                        {tx.category.name}
                      </span>
                    ) : (
                      <span className="text-text-tertiary text-sm">—</span>
                    )}
                    {tx.aiCategorized && (
                      <span
                        title="Categorizada por la IA"
                        className="ml-1.5 inline-flex"
                      >
                        {(() => {
                          const Spark = icons.sparkles
                          return (
                            <Spark
                              strokeWidth={1.5}
                              className="size-3"
                              style={{ color: 'var(--accent-ai)' }}
                            />
                          )
                        })()}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Amount
                      value={tx.amountOriginal}
                      currency={tx.currency}
                      kind={kindToTone[tx.kind]}
                      showPositiveSign={tx.kind === 'income'}
                      className="text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatRelativeDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(date)
}
