'use client'

import type { FollowUpChip } from '@/lib/copilot/render/answer-ast'

/** Chips clickables al pie de una respuesta. Click → nuevo turno. */
export function FollowUpChips({
  chips,
  onPick,
}: {
  chips: FollowUpChip[]
  onPick: (utterance: string) => void
}) {
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {chips.slice(0, 3).map((c) => (
        <button
          key={c.utterance}
          type="button"
          onClick={() => onPick(c.utterance)}
          className="border-border-default hover:bg-surface-hover hover:text-text text-text-secondary rounded-full border px-3 py-1 text-[12px] transition-colors"
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
