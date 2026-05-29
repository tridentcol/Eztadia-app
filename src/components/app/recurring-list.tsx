'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  deleteRecurringRule,
  runRecurringNow,
  toggleRecurringRule,
} from '@/app/(app)/mi-plan/recurrentes/actions'
import type {
  RecurringDriftSnapshot,
  RecurringRuleListItem,
} from '@/lib/db/queries/recurring'
import { icons } from '@/lib/design/icons'
import { cn } from '@/lib/utils'
import { RecurringDriftTimeline } from './recurring-drift-timeline'

const freqLabel: Record<RecurringRuleListItem['frequency'], string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
}

type GroupKey = 'income' | 'subscriptions' | 'fixed_expenses'

const GROUP_META: Record<
  GroupKey,
  { label: string; description: string }
> = {
  income: {
    label: 'Ingresos',
    description: 'Salario, freelance, rentas',
  },
  subscriptions: {
    label: 'Suscripciones',
    description: 'Streaming, software, membresías',
  },
  fixed_expenses: {
    label: 'Gastos fijos',
    description: 'Arriendo, servicios, créditos',
  },
}

// Heurística simple para detectar suscripciones entre los gastos: nombre o
// categoría que machee marcas comunes o keywords. No es perfecta pero acerca el
// agrupamiento al modelo mental del usuario; siempre puede recategorizar en la
// tx individual.
const SUBSCRIPTION_PATTERNS = [
  /netflix|spotify|hbo|disney|apple ?(tv|music|one)|amazon ?prime|youtube ?premium/i,
  /icloud|google ?one|onedrive|dropbox/i,
  /chatgpt|claude|notion|figma|github|gitlab|jetbrains|adobe|canva/i,
  /suscrip|membres[ií]a|streaming|software|saas/i,
]

function classifyRule(r: RecurringRuleListItem): GroupKey {
  if (r.kind === 'income') return 'income'
  const haystack = `${r.description} ${r.categoryName ?? ''}`
  const looksLikeSubscription = SUBSCRIPTION_PATTERNS.some((re) =>
    re.test(haystack),
  )
  return looksLikeSubscription ? 'subscriptions' : 'fixed_expenses'
}

export function RecurringList({
  rules,
  driftSnapshots = [],
}: {
  rules: RecurringRuleListItem[]
  driftSnapshots?: RecurringDriftSnapshot[]
}) {
  const snapshotById = new Map(driftSnapshots.map((s) => [s.ruleId, s]))
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onToggle(id: string) {
    startTransition(async () => {
      const res = await toggleRecurringRule(id)
      if (!res.ok) toast.error(res.error.message)
      router.refresh()
    })
  }

  function onDelete(id: string) {
    if (!confirm('Eliminar esta regla?')) return
    startTransition(async () => {
      const res = await deleteRecurringRule(id)
      if (!res.ok) toast.error(res.error.message)
      router.refresh()
    })
  }

  function onRunNow() {
    startTransition(async () => {
      const res = await runRecurringNow()
      if (!res.ok) {
        toast.error(res.error.message)
        return
      }
      const { processed, created } = res.data
      if (processed === 0) {
        toast.message('Sin reglas vencidas.')
      } else {
        toast.success(`${created} de ${processed} ejecutadas.`)
      }
      router.refresh()
    })
  }

  const groups: Record<GroupKey, RecurringRuleListItem[]> = {
    income: [],
    subscriptions: [],
    fixed_expenses: [],
  }
  for (const r of rules) {
    groups[classifyRule(r)].push(r)
  }

  const orderedGroups: GroupKey[] = ['income', 'fixed_expenses', 'subscriptions']
  const activeCount = rules.filter((r) => r.active).length

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-text-secondary text-[13px]">
          {activeCount} {activeCount === 1 ? 'activa' : 'activas'} ·{' '}
          {rules.length} total
        </span>
        <button
          type="button"
          onClick={onRunNow}
          disabled={pending}
          className="text-text-tertiary hover:text-text-secondary text-[12px] underline-offset-2 transition-colors hover:underline disabled:opacity-50"
        >
          Procesar vencidas
        </button>
      </div>

      {orderedGroups.map((key) => {
        const items = groups[key]
        if (items.length === 0) return null
        const meta = GROUP_META[key]
        return (
          <section key={key} className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <h2 className="text-text text-sm font-semibold">{meta.label}</h2>
                <p className="text-text-tertiary text-[11px]">{meta.description}</p>
              </div>
              <span className="text-text-tertiary shrink-0 text-[11px] tabular">
                {items.length}
              </span>
            </header>

            <ul className="flex flex-col gap-2">
              {items.map((r) => (
                <RuleItem
                  key={r.id}
                  rule={r}
                  pending={pending}
                  snapshot={snapshotById.get(r.id)}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function RuleItem({
  rule: r,
  pending,
  snapshot: snap,
  onToggle,
  onDelete,
}: {
  rule: RecurringRuleListItem
  pending: boolean
  snapshot: RecurringDriftSnapshot | undefined
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const Repeat = icons.repeat
  const showTimeline = r.active && r.dayOfMonth !== null && r.frequency === 'monthly'

  return (
    <li
      className={cn(
        'border-border-default bg-surface flex min-w-0 flex-col gap-4 rounded-[12px] border p-4',
        !r.active && 'opacity-60',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Repeat
            strokeWidth={1.5}
            className={cn(
              'mt-0.5 size-4 shrink-0',
              r.kind === 'income' ? 'text-positive' : 'text-text-tertiary',
            )}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-text truncate text-sm font-semibold">
              {r.description}
            </span>
            <span className="text-text-tertiary text-[11px]">
              {freqLabel[r.frequency]} ·{' '}
              {r.kind === 'income' ? 'Ingreso' : 'Gasto'} de {r.amount}{' '}
              {r.currency}
            </span>
            <span className="text-text-tertiary text-[11px]">
              {r.accountName ?? '—'}
              {r.categoryName ? ` · ${r.categoryName}` : ''}
              {r.nextRun ? ` · próxima ${r.nextRun}` : ''}
              {!r.autoCreate ? ' · pide confirmación' : ''}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:self-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onToggle(r.id)}
            disabled={pending}
          >
            {r.active ? 'Pausar' : 'Activar'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(r.id)}
            disabled={pending}
          >
            Eliminar
          </Button>
        </div>
      </div>

      {showTimeline && snap && (
        <div className="border-border-default/60 border-t pt-3">
          <RecurringDriftTimeline snapshot={snap} />
        </div>
      )}
    </li>
  )
}
