'use client'

import { useMemo } from 'react'

import { icons } from '@/lib/design/icons'
import { getContextualSuggestions } from '@/lib/copilot/conversation/suggestions'

/**
 * Estado vacío del copiloto: 4 sugerencias en grid 2x2, con icono lucide,
 * título e indicación. Las sugerencias se priorizan según día/hora (lunes a.m.
 * → pagos de la semana; inicio de mes → cierre; fin de mes → presupuestos).
 */
export function CopilotEmptyState({ onPick }: { onPick: (utterance: string) => void }) {
  const suggestions = useMemo(() => getContextualSuggestions(new Date()), [])

  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="editorial text-text-secondary text-base italic">
        Pregúntame sobre saldos, gastos, presupuestos o lo que se viene. Respondo con
        o sin IA conectada.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s) => {
          const Icon = icons[s.icon]
          return (
            <button
              key={s.utterance}
              type="button"
              onClick={() => onPick(s.utterance)}
              className="border-border-default hover:bg-surface-hover group flex flex-col gap-1.5 rounded-[12px] border px-3.5 py-3 text-left transition-colors"
            >
              <Icon strokeWidth={1.5} className="text-text-tertiary group-hover:text-text size-4 transition-colors" />
              <span className="text-text text-[13px] font-medium">{s.title}</span>
              <span className="text-text-tertiary text-[11px]">{s.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
