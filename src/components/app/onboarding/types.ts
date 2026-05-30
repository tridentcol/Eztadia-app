import type { CommStyle, Focus, Literacy } from '@/lib/ai/copilot/persona'

export type Currency = 'COP' | 'USD' | 'EUR' | 'MXN'
export type Locale = 'es-CO' | 'es-ES' | 'en-US' | 'es-MX'
export type IncomeRange = 'under_2m' | '2m_5m' | '5m_10m' | '10m_20m' | 'over_20m' | 'prefer_not'
export type SavingsMethod = 'percentage_income' | 'fixed_amount' | 'none' | 'other'

/** Estado del wizard de onboarding. p1/p2/p3 guardan el `value` de la opción del mini-test. */
export type WizardState = {
  currency: Currency
  locale: Locale
  incomeRange: IncomeRange | null
  method: SavingsMethod | null
  percent: number
  fixedAmount: string
  literacy: Literacy | null
  commStyle: CommStyle | null
  p1: string | null
  p2: string | null
  p3: string | null
  focus: Focus[]
}

export const INITIAL_STATE: WizardState = {
  currency: 'COP',
  locale: 'es-CO',
  incomeRange: null,
  method: null,
  percent: 10,
  fixedAmount: '',
  literacy: null,
  commStyle: null,
  p1: null,
  p2: null,
  p3: null,
  focus: [],
}

export type WizardAction =
  | { type: 'set'; patch: Partial<WizardState> }
  | { type: 'toggleFocus'; value: Focus }

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'set':
      return { ...state, ...action.patch }
    case 'toggleFocus': {
      if (state.focus.includes(action.value)) {
        return { ...state, focus: state.focus.filter((f) => f !== action.value) }
      }
      if (state.focus.length >= 2) return state // máximo 2
      return { ...state, focus: [...state.focus, action.value] }
    }
  }
}

export type StepProps = {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}
