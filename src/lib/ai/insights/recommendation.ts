import 'server-only'
import { generateObject } from 'ai'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/lib/db/client'
import { CLAUDE_MODEL_ID, getAnthropic } from '../anthropic'
import type { DetectedInsight, InsightContext } from './types'

/**
 * Recomendaciones generadas por Claude Sonnet 4.6.
 *
 * Le pasamos un snapshot estructurado (totales mensuales por kind, top
 * categorías expense, presupuestos con su progreso). El LLM devuelve hasta
 * 2 recomendaciones accionables. Sin keys → no-op (return []).
 *
 * Importante: el LLM NO ve transacciones individuales — sólo agregados — para
 * minimizar tokens y evitar leak de detalles sensibles innecesarios.
 */
const recommendationSchema = z.object({
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        body: z.string().min(1).max(280),
        severity: z.enum(['info', 'notice', 'warning']),
        category: z.string().nullable().optional(),
      }),
    )
    .max(2),
})

type Snapshot = {
  monthly: Array<{ month: string; income: number; expense: number; net: number }>
  topCategories: Array<{ name: string; total: number; pctOfExpense: number }>
  budgets: Array<{ category: string; amount: number; spent: number; status: string }>
}

async function buildSnapshot(ctx: InsightContext): Promise<Snapshot> {
  const monthlyRows = await db.execute<{
    month: string
    income: string
    expense: string
  }>(sql`
    SELECT
      to_char(date_trunc('month', date::date), 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN kind='income'  THEN amount_base ELSE 0 END), 0)::text AS income,
      COALESCE(SUM(CASE WHEN kind='expense' THEN amount_base ELSE 0 END), 0)::text AS expense
    FROM transactions
    WHERE user_id = ${ctx.userId}
      AND deleted_at IS NULL
      AND date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date
    GROUP BY month
    ORDER BY month
  `)

  const topCats = await db.execute<{ name: string; total: string }>(sql`
    SELECT c.name, SUM(t.amount_base)::text AS total
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ${ctx.userId}
      AND t.deleted_at IS NULL
      AND t.kind = 'expense'
      AND t.date >= date_trunc('month', CURRENT_DATE)::date
    GROUP BY c.name
    ORDER BY SUM(t.amount_base) DESC
    LIMIT 5
  `)

  const budgetRows = await db.execute<{
    name: string
    amount: string
    spent: string
  }>(sql`
    WITH ranges AS (
      SELECT
        b.id,
        b.category_id,
        c.name,
        b.amount::text AS amount,
        date_trunc('month', CURRENT_DATE)::date AS period_start,
        (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date AS period_end
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      WHERE b.user_id = ${ctx.userId}
        AND b.archived = false
        AND b.period = 'monthly'
    )
    SELECT r.name, r.amount,
      COALESCE((
        SELECT SUM(t.amount_base)::text FROM transactions t
        WHERE t.user_id = ${ctx.userId}
          AND t.category_id = r.category_id
          AND t.kind = 'expense'
          AND t.deleted_at IS NULL
          AND t.date >= r.period_start
          AND t.date <= r.period_end
      ), '0') AS spent
    FROM ranges r
  `)

  const monthly = monthlyRows.map((r) => {
    const inc = Number.parseFloat(r.income)
    const exp = Number.parseFloat(r.expense)
    return {
      month: r.month,
      income: round2(inc),
      expense: round2(exp),
      net: round2(inc - exp),
    }
  })

  const totalExpense = topCats.reduce(
    (a, c) => a + Number.parseFloat(c.total),
    0,
  )
  const topCategories = topCats.map((c) => {
    const total = Number.parseFloat(c.total)
    return {
      name: c.name,
      total: round2(total),
      pctOfExpense: totalExpense > 0 ? round2((total / totalExpense) * 100) : 0,
    }
  })

  const budgets = budgetRows.map((b) => {
    const amount = Number.parseFloat(b.amount)
    const spent = Number.parseFloat(b.spent)
    const pct = amount > 0 ? spent / amount : 0
    let status = 'safe'
    if (pct >= 1) status = 'exceeded'
    else if (pct >= 0.8) status = 'warning'
    return { category: b.name, amount: round2(amount), spent: round2(spent), status }
  })

  return { monthly, topCategories, budgets }
}

export async function generateRecommendations(
  ctx: InsightContext,
): Promise<DetectedInsight[]> {
  const provider = getAnthropic()
  if (!provider) return []
  const snapshot = await buildSnapshot(ctx)
  if (snapshot.monthly.length === 0 && snapshot.topCategories.length === 0) {
    return []
  }

  try {
    const { object } = await generateObject({
      model: provider(CLAUDE_MODEL_ID),
      schema: recommendationSchema,
      system:
        'Eres un asesor financiero personal en español, sobrio y profesional. ' +
        'Analizas el snapshot del usuario y devuelves hasta 2 recomendaciones ' +
        'concretas, accionables, sin moralina, sin emojis, sin signos de ' +
        'exclamación. Cada recomendación trata UNA cosa específica. Si el ' +
        'panorama es saludable, devuelve un array vacío — no inventes consejos.',
      prompt: `Snapshot del usuario (montos en ${ctx.baseCurrency}):\n\n${JSON.stringify(snapshot, null, 2)}`,
    })

    const periodStart = monthStart(ctx.today)
    const periodEnd = monthEnd(ctx.today)
    return object.recommendations.map((rec, idx) => ({
      kind: 'recommendation' as const,
      severity: rec.severity,
      title: rec.title,
      body: rec.body,
      data: {
        signature: `recommendation:${periodEnd}:${idx}`,
        category: rec.category ?? null,
      },
      action: null,
      status: 'unread' as const,
      periodStart,
      periodEnd,
      generatedBy: CLAUDE_MODEL_ID,
      signature: `recommendation:${periodEnd}:${idx}`,
    }))
  } catch {
    return []
  }
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function monthStart(today: string): string {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(1)
  return d.toISOString().slice(0, 10)
}

function monthEnd(today: string): string {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + 1)
  d.setUTCDate(0)
  return d.toISOString().slice(0, 10)
}
