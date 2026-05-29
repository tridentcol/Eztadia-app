import 'server-only'

import { formatMoney } from '@/lib/currency/format'
import type { CurrencyCode } from '@/lib/currency/currencies'
import type { Tone } from '../render/answer-ast'
import type { EngineContext, PeriodSlot, Slots } from './types'

/** Formatea un monto en la moneda dada (default base del usuario). */
export function money(value: string | number, currency: string): string {
  return formatMoney(value, { currency: currency as CurrencyCode })
}

/** Período del turno, con default al mes en curso si no hubo pista temporal. */
export function periodOrThisMonth(slots: Slots, ctx: EngineContext): PeriodSlot {
  if (slots.period) return slots.period
  const today = new Date(`${ctx.todayIso}T00:00:00Z`)
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: 'este mes',
    granularity: 'month',
  }
}

/** Tono según signo de un neto (positivo = bueno, negativo = malo). */
export function toneForNet(net: number): Tone {
  if (net > 0) return 'positive'
  if (net < 0) return 'negative'
  return 'neutral'
}

/** Capitaliza la primera letra (para labels de período). */
export function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}
