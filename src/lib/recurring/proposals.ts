import 'server-only'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db/client'

/**
 * Sugerencias de reglas recurrentes para que el usuario las cree con un click.
 *
 * Diferencia con `detectRecurring` (que vive como insight): aquí no generamos
 * texto humano, retornamos datos crudos listos para alimentar el form de
 * NewRecurringDialog/createRecurringRule directamente. La idea es: "el motor
 * ya detectó esto, una sola acción y queda registrado".
 *
 * Heurística (alineada con recurring-detection.ts):
 *  - Mismo merchant (normalizado) con ≥ 3 ocurrencias en últimos 90 días
 *  - Intervalo medio entre ocurrencias 22-38 días (mensual)
 *  - Sin recurring_rule_id ya asignada
 *  - Para cada merchant: agrega monto promedio, cuenta más usada, día del
 *    mes más común, currency más usada.
 */

export type ProposedRecurring = {
  merchant: string
  occurrences: number
  avgIntervalDays: number
  /** Monto promedio (en la moneda más usada). */
  avgAmount: string
  /** Cuenta donde se asentó más veces. */
  accountId: string
  accountName: string
  /** Día del mes más frecuente entre las ocurrencias. */
  dayOfMonth: number
  /** Moneda de la mayoría de las ocurrencias. */
  currency: string
  /** Para mostrar al usuario. */
  lastSeen: string
  /** category más usada, si aplica. */
  categoryId: string | null
  categoryName: string | null
}

type Row = {
  merchant: string
  count: number
  avg_amount: string
  avg_interval_days: number
  account_id: string
  account_name: string
  day_of_month: number
  currency: string
  last_seen: string
  category_id: string | null
  category_name: string | null
}

const MIN_OCCURRENCES = 3

export async function proposeRecurringRules(
  userId: string,
): Promise<ProposedRecurring[]> {
  const rows = await db.execute<Row>(sql`
    WITH txs AS (
      SELECT
        t.id,
        t.account_id,
        t.category_id,
        t.date::date AS date,
        EXTRACT(DAY FROM t.date)::int AS day_of_month,
        t.amount_original::numeric AS amount,
        t.currency,
        LOWER(TRIM(COALESCE(t.merchant, t.description))) AS merchant_norm
      FROM transactions t
      WHERE t.user_id = ${userId}
        AND t.deleted_at IS NULL
        AND t.kind = 'expense'
        AND t.recurring_rule_id IS NULL
        AND t.date >= (CURRENT_DATE - INTERVAL '90 days')
        AND LENGTH(LOWER(TRIM(COALESCE(t.merchant, t.description)))) >= 4
    ),
    /* Ranking de cuenta por merchant: la más frecuente. */
    account_ranks AS (
      SELECT
        merchant_norm,
        account_id,
        ROW_NUMBER() OVER (
          PARTITION BY merchant_norm ORDER BY COUNT(*) DESC
        ) AS rk
      FROM txs
      GROUP BY merchant_norm, account_id
    ),
    /* Ranking de día del mes por merchant. */
    day_ranks AS (
      SELECT
        merchant_norm,
        day_of_month,
        ROW_NUMBER() OVER (
          PARTITION BY merchant_norm ORDER BY COUNT(*) DESC
        ) AS rk
      FROM txs
      GROUP BY merchant_norm, day_of_month
    ),
    /* Ranking de moneda por merchant. */
    currency_ranks AS (
      SELECT
        merchant_norm,
        currency,
        ROW_NUMBER() OVER (
          PARTITION BY merchant_norm ORDER BY COUNT(*) DESC
        ) AS rk
      FROM txs
      GROUP BY merchant_norm, currency
    ),
    /* Ranking de category por merchant — opcional. */
    category_ranks AS (
      SELECT
        merchant_norm,
        category_id,
        ROW_NUMBER() OVER (
          PARTITION BY merchant_norm ORDER BY COUNT(*) DESC
        ) AS rk
      FROM txs
      WHERE category_id IS NOT NULL
      GROUP BY merchant_norm, category_id
    ),
    grouped AS (
      SELECT
        merchant_norm,
        COUNT(*)::int AS count,
        AVG(amount)::text AS avg_amount,
        /* date - date en Postgres retorna integer (días), no interval.
           Dividir directamente — usar EXTRACT EPOCH falla porque EPOCH
           no acepta integer. */
        (MAX(date) - MIN(date))::numeric / NULLIF(COUNT(*) - 1, 0) AS avg_interval_days,
        MAX(date)::text AS last_seen
      FROM txs
      GROUP BY merchant_norm
    )
    SELECT
      g.merchant_norm AS merchant,
      g.count,
      g.avg_amount,
      g.avg_interval_days,
      ar.account_id,
      a.name AS account_name,
      dr.day_of_month,
      cr.currency,
      g.last_seen,
      catr.category_id,
      c.name AS category_name
    FROM grouped g
    JOIN account_ranks ar  ON ar.merchant_norm = g.merchant_norm AND ar.rk = 1
    JOIN day_ranks dr      ON dr.merchant_norm = g.merchant_norm AND dr.rk = 1
    JOIN currency_ranks cr ON cr.merchant_norm = g.merchant_norm AND cr.rk = 1
    LEFT JOIN category_ranks catr ON catr.merchant_norm = g.merchant_norm AND catr.rk = 1
    LEFT JOIN accounts a   ON a.id = ar.account_id
    LEFT JOIN categories c ON c.id = catr.category_id
    WHERE g.count >= ${MIN_OCCURRENCES}
      AND g.avg_interval_days BETWEEN 22 AND 38
    ORDER BY g.count DESC
    LIMIT 5
  `)

  return rows.map((r) => ({
    merchant: r.merchant,
    occurrences: r.count,
    avgIntervalDays: Math.round(r.avg_interval_days),
    avgAmount: Number.parseFloat(r.avg_amount).toFixed(2),
    accountId: r.account_id,
    accountName: r.account_name,
    dayOfMonth: r.day_of_month,
    currency: r.currency,
    lastSeen: r.last_seen,
    categoryId: r.category_id,
    categoryName: r.category_name,
  }))
}
