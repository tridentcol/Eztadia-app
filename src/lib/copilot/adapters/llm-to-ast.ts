import type { AnswerBlock, AnswerPayload } from '../render/answer-ast'

/**
 * Adapta un mensaje del assistant a AnswerPayload para que el renderer de chat
 * sea único con o sin IA.
 *
 * - Si el server emitió un part `data-answer` (camino heurístico), se usa su
 *   payload tal cual: bloques estructurados Noir.
 * - Si no (camino LLM streaming), se construye desde los parts de texto. El
 *   LLM ya redacta la respuesta en prosa; la mostramos como bloques de texto
 *   editorial. Los tool parts intermedios no se renderizan (el texto final los
 *   resume).
 *
 * Tipamos los parts de forma laxa: useChat v6 añade campos según versión.
 */
type LoosePart = {
  type?: string
  text?: string
  data?: unknown
}

type LooseMessage = {
  role?: string
  parts?: LoosePart[]
}

function isAnswerPayload(v: unknown): v is AnswerPayload {
  return (
    typeof v === 'object' &&
    v !== null &&
    Array.isArray((v as { blocks?: unknown }).blocks)
  )
}

/** Devuelve el AnswerPayload de un mensaje assistant, o null si aún no hay contenido. */
export function llmMessageToAnswer(message: LooseMessage): AnswerPayload | null {
  const parts = message.parts ?? []

  // Camino heurístico: part estructurado.
  for (const p of parts) {
    if (p.type === 'data-answer' && isAnswerPayload(p.data)) {
      return p.data
    }
  }

  // Camino LLM: juntar texto.
  const text = parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
    .trim()

  if (text.length === 0) return null

  const blocks: AnswerBlock[] = [{ type: 'text', body: text }]
  return { blocks }
}
