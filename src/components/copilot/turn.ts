import type { AnswerPayload } from '@/lib/copilot/render/answer-ast'

/**
 * Turno del chat. El user aporta texto plano; el assistant aporta un
 * AnswerPayload (heurístico directo o LLM adaptado), o `pending` mientras
 * llega la respuesta.
 */
export type Turn =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; payload: AnswerPayload }
  | { id: string; role: 'assistant'; pending: true }
