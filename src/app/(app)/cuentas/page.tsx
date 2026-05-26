import type { Metadata } from 'next'

import { requireCurrentUser } from '@/lib/auth'
import { listAccountsWithBalance } from '@/lib/db/queries/accounts'
import { EmptyState } from '@/components/app/empty-state'
import { Amount } from '@/components/app/amount'
import { NewAccountTrigger } from '@/components/app/new-account-trigger'
import { icons, type IconName } from '@/lib/design/icons'

export const metadata: Metadata = {
  title: 'Cuentas',
}

const typeMeta: Record<
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'cash'
  | 'investment'
  | 'crypto'
  | 'other',
  { label: string; icon: IconName }
> = {
  checking: { label: 'Cuenta corriente', icon: 'landmark' },
  savings: { label: 'Ahorros', icon: 'piggy-bank' },
  credit_card: { label: 'Tarjeta', icon: 'credit-card' },
  cash: { label: 'Efectivo', icon: 'banknote' },
  investment: { label: 'Inversión', icon: 'trending-up' },
  crypto: { label: 'Cripto', icon: 'bitcoin' },
  other: { label: 'Otra', icon: 'circle' },
}

export default async function CuentasPage() {
  const user = await requireCurrentUser()
  const accountsList = await listAccountsWithBalance(user.id)

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-text-secondary text-sm">Cuentas</p>
          <h1 className="text-text text-3xl font-semibold tracking-[-0.02em]">
            Todas tus cuentas
          </h1>
        </div>
        <NewAccountTrigger />
      </header>

      {accountsList.length === 0 ? (
        <EmptyState
          headline="Todavía no hay cuentas registradas."
          body="Las cuentas son la base de Finanzia: corrientes, tarjetas, ahorros, inversiones. Empieza por una — siempre se pueden agregar más."
          action={<NewAccountTrigger />}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {accountsList.map((a) => {
            const meta = typeMeta[a.type]
            const Icon = icons[a.icon as IconName] ?? icons[meta.icon]
            return (
              <li key={a.id}>
                <article className="border-border-default bg-surface group relative flex flex-col gap-5 rounded-[12px] border p-5">
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="border-border-default flex h-9 w-9 items-center justify-center rounded-md border"
                        style={a.color ? { color: a.color } : undefined}
                      >
                        <Icon strokeWidth={1.5} className="h-4 w-4" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-text text-sm font-semibold">
                          {a.name}
                        </span>
                        <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-text-tertiary text-[11px] tracking-wider">
                      {a.currency}
                    </span>
                  </header>

                  <div className="flex flex-col gap-1">
                    <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
                      Saldo actual
                    </span>
                    <Amount
                      value={a.currentBalance}
                      currency={a.currency}
                      kind={parseFloat(a.currentBalance) < 0 ? 'negative' : 'neutral'}
                      className="text-2xl"
                    />
                  </div>

                  {a.creditLimit && (
                    <div className="border-border-default/60 flex items-baseline justify-between gap-2 border-t pt-3 text-[12px]">
                      <span className="text-text-tertiary">Cupo</span>
                      <Amount
                        value={a.creditLimit}
                        currency={a.currency}
                        className="text-text-secondary text-[12px]"
                      />
                    </div>
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
