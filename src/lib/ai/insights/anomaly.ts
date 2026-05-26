import 'server-only'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import type { DetectedInsight, InsightContext } from './types'

/**
 * Anomalías semanales por categoría.
 *
 * Para cada categoría expense del usuario:
 *  - Total gastado en los últimos 7 días (semana actual).
 *  - Media + desviación estándar de los totales semanales de las 8 semanas
 *    PREVIAS (no incluye la actual).
 *  - Si la semana actual supera media + 2σ Y σ > 0 Y la media de referencia
 *    no es trivial (>= 5 unidades base), generamos un insight.
 *
 * Severity:
 *  - z >= 3 → 'warning'
 *  - z >= 2 → 'notice'
 */
type Row = {
  category_id: string
  category_name: string
  category_color: string | null
  current_week: string
  baseline_mean: string
  baseline_std: string
  baseline_weeks: number
}

const Z_NOTICE = 2
const Z_WARNING = 3
const MIN_BASELINE_MEAN = 5

export async function detectAnomalies(ctx: InsightContext): Promise<DetectedInsight[]> {
  const rows = await db.execute<Row>(sql`
    WITH weekly AS (
      SELECT
        c.id  AS category_id,
        c.name AS category_name,
        c.color AS category_color,
        date_trunc('week', t.date::date)::date AS week_start,
        SUM(t.amount_base)::numeric AS total
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ${ctx.userId}
        AND t.deleted_at IS NULL
        AND t.kind = 'expense'
        AND t.date >= (CURRENT_DATE - INTERVAL '63 days')
      GROUP BY c.id, c.name, c.color, week_start
    ),
    current_w AS (
      SELECT category_id, total::text AS current_week
      FROM weekly
      WHERE week_start = date_trunc('week', CURRENT_DATE)::date
    ),
    baseline AS (
      SELECT
        category_id,
        AVG(total)::text AS baseline_mean,
        COALESCE(STDDEV_POP(total), 0)::text AS baseline_std,
        COUNT(*)::int AS baseline_weeks
      FROM weekly
      WHERE week_start < date_trunc('week', CURRENT_DATE)::date
      GROUP BY category_id
    )
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.color AS category_color,
      COALESCE(cw.current_week, '0') AS current_week,
      COALESCE(b.baseline_mean, '0') AS baseline_mean,
      COALESCE(b.baseline_std, '0') AS baseline_std,
      COALESCE(b.baseline_weeks, 0) AS baseline_weeks
    FROM categories c
    JOIN current_w cw ON cw.category_id = c.id
    LEFT JOIN baseline b ON b.category_id = c.id
    WHERE b.baseline_weeks >= 4
  `)

  const out: DetectedInsight[] = []
  for (const r of rows) {
    const current = Number.parseFloat(r.current_week)
    const mean = Number.parseFloat(r.baseline_mean)
    const std = Number.parseFloat(r.baseline_std)
    if (!Number.isFinite(current) || !Number.isFinite(mean) || !Number.isFinite(std)) continue
    if (std <= 0 || mean < MIN_BASELINE_MEAN) continue
    const z = (current - mean) / std
    if (z < Z_NOTICE) continue

    const severity = z >= Z_WARNING ? 'warning' : 'notice'
    const multiplier = mean > 0 ? current / mean : 1
    const periodStart = isoWeekStart(ctx.today)
    const periodEnd = ctx.today

    out.push({
      kind: 'anomaly',
      severity,
      title: `Gasto inusual en ${r.category_name}`,
      body:
        `Esta semana llevas ${formatMultiplier(multiplier)} respecto al promedio reciente. ` +
        `Total actual frente a baseline en ${ctx.baseCurrency}.`,
      data: {
        signature: `anomaly:${r.category_id}:${periodStart}`,
        categoryId: r.category_id,
        categoryName: r.category_name,
        categoryColor: r.category_color,
        currentWeek: current.toFixed(2),
        baselineMean: mean.toFixed(2),
        baselineStd: std.toFixed(2),
        zScore: Number(z.toFixed(2)),
      },
      action: {
        type: 'view-transactions',
        params: { categoryId: r.category_id, from: periodStart, to: periodEnd },
        label: 'Ver transacciones',
      },
      status: 'unread',
      periodStart,
      periodEnd,
      generatedBy: 'anomaly-detector',
      signature: `anomaly:${r.category_id}:${periodStart}`,
    } as DetectedInsight)
  }
  return out
}

function formatMultiplier(m: number): string {
  if (m >= 3) return `${m.toFixed(1)}× más`
  if (m >= 2) return `${m.toFixed(1)}× más`
  const pct = (m - 1) * 100
  return `${pct.toFixed(0)}% más`
}

function isoWeekStart(today: string): string {
  const d = new Date(`${today}T00:00:00Z`)
  const day = d.getUTCDay()
  const diff = (day + 6) % 7 // 0 = lunes
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}
