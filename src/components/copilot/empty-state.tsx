'use client'

/**
 * Estado vacío del copiloto. Versión base; B6 la hace contextual según
 * día/hora y actividad reciente.
 */
const SUGGESTIONS: Array<{ title: string; utterance: string }> = [
  { title: 'Cuál es mi saldo total', utterance: 'cuál es mi saldo total' },
  { title: 'En qué gasté este mes', utterance: 'en qué gasté este mes' },
  { title: 'Cómo van mis presupuestos', utterance: 'cómo van mis presupuestos' },
  { title: 'Qué pagos se vienen', utterance: 'qué pagos se vienen' },
]

export function CopilotEmptyState({ onPick }: { onPick: (utterance: string) => void }) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="editorial text-text-secondary text-base italic">
        Pregúntame sobre saldos, gastos, presupuestos o lo que se viene. Respondo con
        o sin IA conectada.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.utterance}
            type="button"
            onClick={() => onPick(s.utterance)}
            className="border-border-default hover:bg-surface-hover text-text-secondary hover:text-text rounded-[10px] border px-3 py-2.5 text-left text-[13px] transition-colors"
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  )
}
