'use client'

import type { ProposalAction } from '@/lib/copilot/render/answer-ast'

/**
 * Acciones contextuales al pie de una respuesta. Stub: la lógica de
 * confirmación + Server Action se implementa en B7.
 */
export function AnswerActions({
  actions,
}: {
  actions: ProposalAction[]
  onConfirm: () => void
  onFollowUp: (utterance: string) => void
}) {
  void actions
  return null
}
