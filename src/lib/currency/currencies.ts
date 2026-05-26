/**
 * Monedas soportadas inicialmente por Finanzia.
 *
 * Foco core: COP (base) y USD. El resto se agrega a demanda. Cada moneda
 * declara symbol, name y decimals para el formateo y validación.
 */

export const currencies = {
  COP: { code: 'COP', symbol: '$', name: 'Peso colombiano', decimals: 0 },
  USD: { code: 'USD', symbol: '$', name: 'Dólar estadounidense', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  MXN: { code: 'MXN', symbol: '$', name: 'Peso mexicano', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'Libra esterlina', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Real brasileño', decimals: 2 },
} as const

export type CurrencyCode = keyof typeof currencies

export const currencyCodes: CurrencyCode[] = Object.keys(
  currencies,
) as CurrencyCode[]

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return code in currencies
}

export function getCurrencyMeta(code: CurrencyCode) {
  return currencies[code]
}
