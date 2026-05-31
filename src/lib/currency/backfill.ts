import 'server-only'
import { and, eq, isNull, ne } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { profiles, transactions } from '@/lib/db/schema'
import { getRate } from './rates'
import { convertMoney } from './convert'

/**
 * Reprocesa las transacciones PROVISIONALES: moneda extranjera con
 * `exchange_rate IS NULL` — el marcador que dejan el webhook y el cron de
 * recurrentes cuando no había tasa al momento de insertar (Fase 1, decisión
 * híbrida). Cuando ya existe una tasa ≤ fecha de la transacción, recalcula
 * `amount_base` con aritmética entera y fija `exchange_rate`.
 *
 * Idempotente: una fila ya corregida deja de tener `exchange_rate` NULL, así
 * que no se vuelve a tocar. Las filas sin tasa disponible aún se reintentan en
 * la próxima corrida. Ignora soft-deletes.
 */
export async function backfillProvisionalRates(
  limit = 500,
): Promise<{ scanned: number; fixed: number }> {
  const rows = await db
    .select({
      id: transactions.id,
      amountOriginal: transactions.amountOriginal,
      currency: transactions.currency,
      date: transactions.date,
      baseCurrency: profiles.baseCurrency,
    })
    .from(transactions)
    .innerJoin(profiles, eq(profiles.userId, transactions.userId))
    .where(
      and(
        isNull(transactions.exchangeRate),
        isNull(transactions.deletedAt),
        ne(transactions.currency, profiles.baseCurrency),
      ),
    )
    .limit(limit)

  let fixed = 0
  for (const row of rows) {
    const rate = await getRate(row.currency, row.baseCurrency, row.date)
    if (!rate) continue
    await db
      .update(transactions)
      .set({
        amountBase: convertMoney(row.amountOriginal, rate),
        exchangeRate: rate,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, row.id))
    fixed++
  }

  return { scanned: rows.length, fixed }
}
