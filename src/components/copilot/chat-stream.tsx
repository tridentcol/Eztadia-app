'use client'

import { useEffect, useRef } from 'react'

import type { Turn } from './turn'
import { ChatMessage } from './chat-message'

/**
 * Lista de turnos con auto-scroll al final. Renderer compartido por el flujo
 * LLM y el heurístico: ambos producen `Turn[]` y se ven idénticos. El scroll
 * usa 'smooth' salvo bajo prefers-reduced-motion.
 */
export function ChatStream({
  turns,
  onFollowUp,
  onConfirm,
}: {
  turns: Turn[]
  onFollowUp: (utterance: string) => void
  onConfirm: () => void
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = endRef.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [turns])

  return (
    <div className="flex flex-col gap-5">
      {turns.map((turn) => (
        <ChatMessage
          key={turn.id}
          turn={turn}
          onFollowUp={onFollowUp}
          onConfirm={onConfirm}
        />
      ))}
      <div ref={endRef} />
    </div>
  )
}
