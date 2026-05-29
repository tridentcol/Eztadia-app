'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { ProposalAction } from '@/lib/copilot/render/answer-ast'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import {
  confirmProposedBudget,
  confirmProposedTransaction,
} from '@/app/(app)/copilot/actions'
import { markInsightRead } from '@/app/(app)/mi-historia/insights/actions'

/**
 * Acciones contextuales al pie de una respuesta. Las de navegación se ejecutan
 * directo; las que MUTAN pasan por ConfirmDialog antes de llamar a la Server
 * Action (regla 6 del mandato). Tras confirmar, refresca la vista y deshabilita
 * el botón para evitar doble-registro.
 */
export function AnswerActions({
  actions,
  onConfirm,
}: {
  actions: ProposalAction[]
  onConfirm: () => void
  onFollowUp: (utterance: string) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState<{ action: ProposalAction; key: string } | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  function trigger(action: ProposalAction, key: string) {
    if (action.kind === 'navigate') {
      router.push(action.href)
      return
    }
    setPending({ action, key })
  }

  async function confirm() {
    if (!pending || busy) return
    const { action, key } = pending
    setBusy(true)
    try {
      if (action.kind === 'create-budget-for-category') {
        const res = await confirmProposedBudget({
          proposal: {
            mode: 'create',
            existingBudgetId: null,
            categoryId: action.categoryId,
            amount: action.suggestedAmount,
            period: 'monthly',
            rollover: false,
          },
        })
        if (!res.ok) return void toast.error(res.error.message)
        toast.success('Presupuesto creado.')
      } else if (action.kind === 'confirm-budget') {
        const res = await confirmProposedBudget({ proposal: action.proposal })
        if (!res.ok) return void toast.error(res.error.message)
        toast.success(action.proposal.mode === 'update' ? 'Presupuesto actualizado.' : 'Presupuesto creado.')
      } else if (action.kind === 'confirm-transaction') {
        const res = await confirmProposedTransaction({ proposal: action.proposal })
        if (!res.ok) return void toast.error(res.error.message)
        toast.success('Movimiento registrado.')
      } else if (action.kind === 'mark-insight-read') {
        const res = await markInsightRead(action.insightId)
        if (!res.ok) return void toast.error(res.error.message)
        toast.success('Marcada como vista.')
      } else {
        return
      }
      setDone((d) => new Set(d).add(key))
      setPending(null)
      onConfirm()
    } finally {
      setBusy(false)
    }
  }

  const pendingMutates =
    pending?.action.kind === 'confirm-transaction' ||
    pending?.action.kind === 'confirm-budget'

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {actions.map((a, i) => {
        const key = `${a.kind}-${i}`
        const isDone = done.has(key)
        return (
          <button
            key={key}
            type="button"
            onClick={() => trigger(a, key)}
            disabled={isDone}
            className="border-border-emphasis hover:bg-surface-hover text-text rounded-[8px] border px-3 py-1.5 text-[12px] transition-colors disabled:cursor-default disabled:opacity-50"
          >
            {isDone ? 'Hecho' : a.label}
          </button>
        )
      })}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && !busy && setPending(null)}
        title={pending?.action.label ?? 'Confirmar'}
        description={
          pending?.action.kind === 'confirm-transaction' ||
          pending?.action.kind === 'confirm-budget'
            ? pending.action.summary
            : pending?.action.kind === 'create-budget-for-category'
              ? `Se creará un presupuesto mensual para ${pending.action.categoryName}.`
              : '¿Confirmas esta acción?'
        }
        confirmLabel={pendingMutates ? 'Confirmar y registrar' : 'Confirmar'}
        onConfirm={confirm}
      />
    </div>
  )
}
