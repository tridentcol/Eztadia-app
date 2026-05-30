import { Input } from '@/components/ui/input'
import { Chip } from './chip'
import type { Currency, IncomeRange, Locale, SavingsMethod, StepProps } from './types'

const CURRENCIES: { value: Currency; label: string; desc: string }[] = [
  { value: 'COP', label: 'COP', desc: 'Peso colombiano' },
  { value: 'USD', label: 'USD', desc: 'Dólar estadounidense' },
  { value: 'EUR', label: 'EUR', desc: 'Euro' },
  { value: 'MXN', label: 'MXN', desc: 'Peso mexicano' },
]

const LOCALES: { value: Locale; label: string; currency: Currency }[] = [
  { value: 'es-CO', label: 'Colombia', currency: 'COP' },
  { value: 'es-MX', label: 'México', currency: 'MXN' },
  { value: 'es-ES', label: 'España', currency: 'EUR' },
  { value: 'en-US', label: 'Estados Unidos', currency: 'USD' },
]

const INCOME_RANGES: { value: IncomeRange; label: string }[] = [
  { value: 'under_2m', label: 'Menos de $2M' },
  { value: '2m_5m', label: '$2M — $5M' },
  { value: '5m_10m', label: '$5M — $10M' },
  { value: '10m_20m', label: '$10M — $20M' },
  { value: 'over_20m', label: 'Más de $20M' },
  { value: 'prefer_not', label: 'Prefiero no decirlo' },
]

const SAVINGS_METHODS: { value: SavingsMethod; label: string; desc: string }[] = [
  { value: 'percentage_income', label: 'Porcentaje del ingreso', desc: 'Ej. 10% de lo que ganas cada mes' },
  { value: 'fixed_amount', label: 'Monto fijo mensual', desc: 'Ej. $500,000 al mes sin importar el ingreso' },
  { value: 'none', label: 'Sin plan por ahora', desc: 'Solo quiero ver mis gastos' },
  { value: 'other', label: 'Otro', desc: 'Lo defino yo después' },
]

const PERCENTAGES = [5, 10, 15, 20, 25, 30]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-text-tertiary text-xs font-medium tracking-[0.06em] uppercase">{children}</p>
  )
}

export function BasicsStep({ state, dispatch }: StepProps) {
  function selectLocale(loc: Locale) {
    const match = LOCALES.find((l) => l.value === loc)
    dispatch({ type: 'set', patch: { locale: loc, ...(match ? { currency: match.currency } : {}) } })
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <FieldLabel>País de residencia</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {LOCALES.map((loc) => (
            <Chip key={loc.value} selected={state.locale === loc.value} onClick={() => selectLocale(loc.value)}>
              {loc.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel>Moneda principal</FieldLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CURRENCIES.map((c) => (
            <Chip
              key={c.value}
              selected={state.currency === c.value}
              onClick={() => dispatch({ type: 'set', patch: { currency: c.value } })}
            >
              <span className="block font-mono text-[13px]">{c.label}</span>
              <span className="text-text-tertiary block text-[11px]">{c.desc}</span>
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}

export function IncomeStep({ state, dispatch }: StepProps) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Ingreso mensual (en {state.currency})</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        {INCOME_RANGES.map((r) => (
          <Chip
            key={r.value}
            selected={state.incomeRange === r.value}
            onClick={() =>
              dispatch({
                type: 'set',
                patch: { incomeRange: state.incomeRange === r.value ? null : r.value },
              })
            }
          >
            {r.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

export function SavingsStep({ state, dispatch }: StepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2">
        {SAVINGS_METHODS.map((m) => (
          <Chip
            key={m.value}
            selected={state.method === m.value}
            onClick={() => dispatch({ type: 'set', patch: { method: m.value } })}
          >
            <span className="block text-[13px] font-medium">{m.label}</span>
            <span className="text-text-tertiary mt-0.5 block text-[11px]">{m.desc}</span>
          </Chip>
        ))}
      </div>

      {state.method === 'percentage_income' && (
        <div className="flex flex-col gap-2 pt-1">
          <FieldLabel>Porcentaje a ahorrar</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {PERCENTAGES.map((p) => (
              <Chip key={p} selected={state.percent === p} onClick={() => dispatch({ type: 'set', patch: { percent: p } })}>
                {p}%
              </Chip>
            ))}
          </div>
        </div>
      )}

      {state.method === 'fixed_amount' && (
        <div className="flex flex-col gap-2 pt-1">
          <FieldLabel>Monto mensual ({state.currency})</FieldLabel>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="500000"
            value={state.fixedAmount}
            onChange={(e) =>
              dispatch({ type: 'set', patch: { fixedAmount: e.target.value.replace(/[^0-9.]/g, '') } })
            }
            className="font-mono tabular-nums"
          />
        </div>
      )}
    </div>
  )
}
