import 'server-only'
import { and, desc, eq, lte, sql } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { exchangeRates } from '@/lib/db/schema'
import { currencyCodes, type CurrencyCode } from './currencies'
import { convertMoney } from './convert'

/**
 * Provider: open.er-api.com (free tier, sin API key, base USD, refresh diario).
 *
 * Si en el futuro el usuario carga `EXCHANGE_RATE_API_KEY` se puede swappear a
 * apilayer/exchangerates_data o exchangerate.host paid sin tocar el resto del
 * pipeline — solo el `fetchDailyRates` cambia.
 */
const PROVIDER = 'open.er-api.com'
const ENDPOINT = 'https://open.er-api.com/v6/latest'

type ProviderResponse = {
  result: 'success' | 'error'
  base_code: string
  rates: Record<string, number>
  time_last_update_unix?: number
  'error-type'?: string
}

export type FetchedRate = {
  fromCurrency: CurrencyCode
  toCurrency: CurrencyCode
  rate: string
  date: string
}

/**
 * Convierte un número a string con 6 decimales (matchea numeric(15,6) en DB).
 */
function rateToString(n: number): string {
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Tasa inválida: ${n}`)
  }
  return n.toFixed(6)
}

function todayIsoDate(): string {
  // YYYY-MM-DD en UTC. La columna `date` no lleva tz y el cron corre en UTC.
  return new Date().toISOString().slice(0, 10)
}

/**
 * Fetcha las tasas del día desde el provider y devuelve los cross-rates entre
 * todas las monedas soportadas (NxN, sin la diagonal). Base USD para el fetch
 * — todos los pairs se derivan dividiendo: from→to = (USD→to) / (USD→from).
 */
export async function fetchDailyRates(date?: string): Promise<FetchedRate[]> {
  const targetDate = date ?? todayIsoDate()
  const resp = await fetch(`${ENDPOINT}/USD`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  })
  if (!resp.ok) {
    throw new Error(`Provider HTTP ${resp.status}: ${resp.statusText}`)
  }
  const payload = (await resp.json()) as ProviderResponse
  if (payload.result !== 'success') {
    throw new Error(`Provider error: ${payload['error-type'] ?? 'unknown'}`)
  }

  const usdRates: Record<string, number> = { USD: 1 }
  for (const code of currencyCodes) {
    if (code === 'USD') continue
    const r = payload.rates[code]
    if (typeof r !== 'number' || r <= 0) {
      throw new Error(`Tasa ausente para ${code} desde ${PROVIDER}`)
    }
    usdRates[code] = r
  }

  const out: FetchedRate[] = []
  for (const from of currencyCodes) {
    for (const to of currencyCodes) {
      if (from === to) continue
      const fromUsd = usdRates[from]
      const toUsd = usdRates[to]
      if (fromUsd === undefined || toUsd === undefined) continue
      // from→to = (1 USD / fromUsd[from]) * toUsd[to]
      out.push({
        fromCurrency: from,
        toCurrency: to,
        rate: rateToString(toUsd / fromUsd),
        date: targetDate,
      })
    }
  }
  return out
}

/**
 * Upserta un set de tasas en `exchange_rates` (PK compuesto date+from+to).
 */
export async function upsertRates(rates: FetchedRate[]): Promise<number> {
  if (rates.length === 0) return 0
  await db
    .insert(exchangeRates)
    .values(
      rates.map((r) => ({
        date: r.date,
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: r.rate,
        source: PROVIDER,
      })),
    )
    .onConflictDoUpdate({
      target: [exchangeRates.date, exchangeRates.fromCurrency, exchangeRates.toCurrency],
      set: {
        rate: sql`excluded.rate`,
        source: sql`excluded.source`,
        fetchedAt: sql`now()`,
      },
    })
  return rates.length
}

/**
 * Devuelve la tasa from→to para la fecha dada. Si no hay registro exacto,
 * cae al último disponible anterior (o igual). Si no hay ninguno, devuelve
 * `null`.
 *
 * Para `from === to` siempre devuelve '1.000000' sin tocar DB.
 */
export async function getRate(
  from: string,
  to: string,
  date: string,
): Promise<string | null> {
  if (from === to) return '1.000000'

  const row = await db
    .select({ rate: exchangeRates.rate })
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.fromCurrency, from),
        eq(exchangeRates.toCurrency, to),
        lte(exchangeRates.date, date),
      ),
    )
    .orderBy(desc(exchangeRates.date))
    .limit(1)

  return row[0]?.rate ?? null
}

/**
 * Resuelve N pares from→to en UNA sola query. Devuelve un Map keyed por
 * `${from}→${to}` con la tasa string ('1.000000' para pares identidad).
 *
 * Equivalente a llamar getRate por cada par, pero sin el waterfall de N
 * round-trips. Útil cuando un caller (dashboard, getTotalBalanceInBase)
 * necesita convertir varios montos a la misma moneda base de golpe.
 *
 * Mantiene el mismo contrato de fallback que getRate: DISTINCT ON toma la
 * última tasa ≤ date por par, incluso si los pares cubren fechas distintas
 * (cron caído etc.). Pares sin registro no aparecen en el map — el caller
 * decide cómo manejar la ausencia.
 */
export async function getRatesForPairs(
  pairs: Array<{ from: string; to: string }>,
  date: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const queryPairs: Array<{ from: string; to: string }> = []
  const seen = new Set<string>()
  for (const p of pairs) {
    const key = `${p.from}->${p.to}`
    if (seen.has(key)) continue
    seen.add(key)
    if (p.from === p.to) {
      out.set(key, '1.000000')
      continue
    }
    queryPairs.push(p)
  }
  if (queryPairs.length === 0) return out

  const values = sql.join(
    queryPairs.map((p) => sql`(${p.from}::text, ${p.to}::text)`),
    sql`, `,
  )
  const rows = await db.execute<{
    from_currency: string
    to_currency: string
    rate: string
  }>(sql`
    WITH pairs(from_currency, to_currency) AS (
      VALUES ${values}
    )
    SELECT DISTINCT ON (er.from_currency, er.to_currency)
      er.from_currency, er.to_currency, er.rate::text AS rate
    FROM exchange_rates er
    JOIN pairs p USING (from_currency, to_currency)
    WHERE er.date <= ${date}
    ORDER BY er.from_currency, er.to_currency, er.date DESC
  `)
  for (const r of rows) {
    out.set(`${r.from_currency}->${r.to_currency}`, r.rate)
  }
  return out
}

/**
 * Convierte un monto string usando la tasa from→to del día.
 * Resultado redondeado a 2 decimales (matchea numeric(15,2) de amount_base).
 * Si no hay tasa disponible y `fallbackToOne` es true, asume 1:1 y deja el
 * llamador loguear/avisar.
 */
export async function convertAmount(
  amount: string,
  from: string,
  to: string,
  date: string,
  options: { fallbackToOne?: boolean } = {},
): Promise<{ amount: string; rate: string; missing: boolean }> {
  const rate = await getRate(from, to, date)
  if (rate === null) {
    if (!options.fallbackToOne) {
      throw new Error(`Sin tasa para ${from}→${to} en o antes de ${date}.`)
    }
    return { amount, rate: '1.000000', missing: true }
  }
  // Aritmética entera exacta (regla #4) — sin float. Lanza si amount/rate no
  // son numéricos, igual que el guard anterior.
  const converted = convertMoney(amount, rate)
  return { amount: converted, rate, missing: false }
}
