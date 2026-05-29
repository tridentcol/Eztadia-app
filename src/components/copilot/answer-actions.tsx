'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { ProposalAction } from '@/lib/copilot/render/answer-ast'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { confirmProposedBudget } from '@/app/(app)/copilot/actions'
import { markInsightRead } from '@/app/(app)/mi-historia/insights/actions'

/**
 * Acciones contextuales al pie de una respuesta. Las de navegación se ejecutan
 * directo; las que MUTAN pasan por ConfirmDialog antes de llamar a la Server
 * Action (regla 6 del mandato). Tras confirmar, refresca la vista.
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
  const [pending, setPending] = useState<ProposalAction | null>(null)

  function trigger(action: ProposalAction) {
    if (action.kind === 'navigate') {
      router.push(action.href)
      return
    }
    setPending(action)
  }

  async function confirm() {
    const action = pending
    if (!action) return
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
      if (!res.ok) {
        toast.error(res.error.message)
        return
      }
      toast.success('Presupuesto creado.')
      onConfirm()
    } else if (action.kind === 'mark-insight-read') {
      const res = await markInsightRead(action.insightId)
      if (!res.ok) {
        toast.error(res.error.message)
        return
      }
      toast.success('Marcada como vista.')
      onConfirm()
    }
    setPending(null)
  }

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {actions.map((a, i) => (
        <button
          key={`${a.kind}-${i}`}
          type="button"
          onClick={() => trigger(a)}
          className="border-border-emphasis hover:bg-surface-hover text-text rounded-[8px] border px-3 py-1.5 text-[12px] transition-colors"
        >
          {a.label}
        </button>
      ))}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.label ?? 'Confirmar'}
        description={
          pending?.kind === 'create-budget-for-category'
            ? `Se creará un presupuesto mensual para ${pending.categoryName}.`
            : '¿Confirmas esta acción?'
        }
        confirmLabel="Confirmar"
        onConfirm={confirm}
      />
    </div>
  )
}
