import {
  COMM_STYLE_OPTIONS,
  FOCUS_OPTIONS,
  LITERACY_OPTIONS,
  TEST_QUESTIONS,
} from '@/lib/ai/copilot/persona'
import { Chip } from './chip'
import type { StepProps } from './types'

export function LiteracyStep({ state, dispatch }: StepProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {LITERACY_OPTIONS.map((o) => (
        <Chip
          key={o.value}
          selected={state.literacy === o.value}
          onClick={() =>
            dispatch({ type: 'set', patch: { literacy: state.literacy === o.value ? null : o.value } })
          }
        >
          <span className="block text-[13px] font-medium">{o.label}</span>
          {o.desc && <span className="text-text-tertiary mt-0.5 block text-[11px]">{o.desc}</span>}
        </Chip>
      ))}
    </div>
  )
}

export function CommStyleStep({ state, dispatch }: StepProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {COMM_STYLE_OPTIONS.map((o) => (
        <Chip
          key={o.value}
          selected={state.commStyle === o.value}
          onClick={() =>
            dispatch({ type: 'set', patch: { commStyle: state.commStyle === o.value ? null : o.value } })
          }
        >
          <span className="block text-[13px] font-medium">{o.label}</span>
          {o.desc && <span className="text-text-tertiary mt-0.5 block text-[11px]">{o.desc}</span>}
        </Chip>
      ))}
    </div>
  )
}

/** Una de las 3 preguntas del mini-test, por índice. Guarda el `value` en p1/p2/p3. */
export function TestStep({ state, dispatch, index }: StepProps & { index: number }) {
  const q = TEST_QUESTIONS[index]
  if (!q) return null
  const key = q.id // 'p1' | 'p2' | 'p3'
  const selected = state[key]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-text text-[15px] leading-snug">{q.prompt}</p>
      <div className="grid grid-cols-1 gap-2">
        {q.options.map((o) => (
          <Chip
            key={o.value}
            selected={selected === o.value}
            onClick={() =>
              dispatch({ type: 'set', patch: { [key]: selected === o.value ? null : o.value } })
            }
          >
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

export function FocusStep({ state, dispatch }: StepProps) {
  const full = state.focus.length >= 2
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FOCUS_OPTIONS.map((o) => {
          const selected = state.focus.includes(o.value)
          return (
            <Chip
              key={o.value}
              selected={selected}
              onClick={() => dispatch({ type: 'toggleFocus', value: o.value })}
            >
              {o.label}
            </Chip>
          )
        })}
      </div>
      <p className="text-text-tertiary text-[11px]">
        {full ? 'Máximo dos. Quita uno para cambiar.' : 'Elige hasta dos.'}
      </p>
    </div>
  )
}

export function ClosingStep() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-text-secondary text-[14px] leading-relaxed">
        Eso es todo. Ajusté Finanzia a tu forma de manejar el dinero — el tono, la profundidad y en
        qué me enfoco. Puedes cambiar cualquier cosa desde Ajustes cuando quieras.
      </p>
    </div>
  )
}
