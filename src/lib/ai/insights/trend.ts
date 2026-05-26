import 'server-only'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import type { DetectedInsight, InsightContext } from './types'

/**
 * Tendencias por categoría a 3 meses.
 *
 * Para las top-N categorías expense de los últimos 90 días, calculamos el
 * gasto mensual de los meses M-3, M-2, M-1 (M = mes actual incompleto se
 * excluye). Una pendiente |Δ/baseline| >= 15% mes-a-mes genera un insight
 * con kind='trend'.
 *
 * Severity 'notice' siempre — las tendencias no son alarma, son señal.
 */
type Row = {
  category_id: string
  category_name: string
  month_start: string
  total: string
}

const TOP_N = 8
const MIN_AVG = 5
const MIN_DELTA_PCT = 0.15

export async function detectTrends(ctx: InsightContext): Promise<DetectedInsight[]> {
  const rows = await db.execute<Row>(sql`
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      date_trunc('month', t.date::date)::date AS month_start,
      SUM(t.amount_base)::text AS total
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ${ctx.userId}
      AND t.deleted_at IS NULL
      AND t.kind = 'expense'
      AND t.date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '3 months')::date
      AND t.date <  date_trunc('month', CURRENT_DATE)::date
    GROUP BY c.id, c.name, month_start
  `)

  const byCat = new Map<
    string,
    { name: string; months: Map<string, number> }
  >()
  for (const r of rows) {
    const cat = byCat.get(r.category_id) ?? {
      name: r.category_name,
      months: new Map<string, number>(),
    }
    cat.months.set(r.month_start, Number.parseFloat(r.total))
    byCat.set(r.category_id, cat)
  }

  // Rankeamos por total agregado de los 3 meses para limitar a TOP_N.
  const ranked = [...byCat.entries()]
    .map(([categoryId, { name, months }]) => {
      const totals = [...months.values()]
      const agg = totals.reduce((a, b) => a + b, 0)
      return { categoryId, name, months, agg }
    })
    .sort((a, b) => b.agg - a.agg)
    .slice(0, TOP_N)

  const periodStart = monthStartString(ctx.today, -3)
  const periodEnd = monthEndString(ctx.today, -1)

  const out: DetectedInsight[] = []
  for (const cat of ranked) {
    if (cat.months.size < 2) continue
    const sortedMonths = [...cat.months.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )
    const first = sortedMonths[0]!
    const last = sortedMonths[sortedMonths.length - 1]!
    const baseline = (first[1] + last[1]) / 2
    if (baseline < MIN_AVG) continue
    const delta = last[1] - first[1]
    const deltaPct = delta / baseline
    if (Math.abs(deltaPct) < MIN_DELTA_PCT) continue

    const direction = delta > 0 ? 'subió' : 'bajó'
    const pctAbs = Math.abs(deltaPct * 100)
    const monthsSpan = sortedMonths.length

    out.push({
      kind: 'trend',
      severity: 'info',
      title: `Tu gasto en ${cat.name} ${direction} ${pctAbs.toFixed(0)}%`,
      body:
        `Comparando los últimos ${monthsSpan} meses cerrados. ` +
        `Pasó de ${first[1].toFixed(0)} a ${last[1].toFixed(0)} ${ctx.baseCurrency}.`,
      data: {
        signature: `trend:${cat.categoryId}:${periodEnd}`,
        categoryId: cat.categoryId,
        categoryName: cat.name,
        series: sortedMonths.map(([m, v]) => ({ month: m, total: v.toFixed(2) })),
        deltaPct: Number((deltaPct * 100).toFixed(1)),
      },
      action: {
        type: 'view-transactions',
        params: { categoryId: cat.categoryId },
        label: 'Ver transacciones',
      },
      status: 'unread',
      periodStart,
      periodEnd,
      generatedBy: 'trend-detector',
      signature: `trend:${cat.categoryId}:${periodEnd}`,
    } as DetectedInsight)
  }
  return out
}

function monthStartString(today: string, offsetMonths: number): string {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + offsetMonths)
  return d.toISOString().slice(0, 10)
}

function monthEndString(today: string, offsetMonths: number): string {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + offsetMonths + 1)
  d.setUTCDate(0)
  return d.toISOString().slice(0, 10)
}
