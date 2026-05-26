import 'server-only'
import { and, eq, gte, ilike, isNull, lte, or, sql } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { categories, transactions } from '@/lib/db/schema'
import {
  getTotalBalanceInBase,
  listAccountsWithBalance,
} from '@/lib/db/queries/accounts'
import { listBudgetsWithProgress } from '@/lib/db/queries/budgets'
import { listInsightsForUser } from '@/lib/db/queries/insights'
import type { Intent } from './types'
import { normalize } from './intent-parser'

// ============================================================
// Periodos comunes
// ============================================================

type Period = { from: string; to: string; label: string }

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function thisMonth(today: string): Period {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(1)
  const start = isoDate(d)
  const end = new Date(d)
  end.setUTCMonth(end.getUTCMonth() + 1)
  end.setUTCDate(0)
  return { from: start, to: isoDate(end), label: 'este mes' }
}

function lastMonth(today: string): Period {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - 1)
  const start = isoDate(d)
  const end = new Date(d)
  end.setUTCMonth(end.getUTCMonth() + 1)
  end.setUTCDate(0)
  return { from: start, to: isoDate(end), label: 'el mes pasado' }
}

function lastDays(today: string, days: number): Period {
  const end = new Date(`${today}T00:00:00Z`)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return { from: isoDate(start), to: isoDate(end), label: `los últimos ${days} días` }
}

function detectPeriod(text: string, today: string): Period {
  const n = normalize(text)
  if (/(mes pasado|ultimo mes|el pasado mes)/.test(n)) return lastMonth(today)
  if (/(ultimos? 30 dias|ultimo mes|treinta dias)/.test(n))
    return lastDays(today, 30)
  if (/(ultima semana|ultimos 7 dias|siete dias)/.test(n))
    return lastDays(today, 7)
  return thisMonth(today)
}

// ============================================================
// Formato moneda simple (server-side, sin Intl heavy)
// ============================================================

function formatMoney(value: string | number, currency: string): string {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value
  if (!Number.isFinite(n)) return '—'
  const decimals = currency === 'COP' ? 0 : 2
  const formatter = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${formatter.format(n)} ${currency}`
}

// ============================================================
// Intents
// ============================================================

const showBalance: Intent = {
  id: 'show-balance',
  label: 'Mi saldo total',
  keywords: ['saldo', 'cuanto tengo', 'balance', 'total'],
  matcher: /\b(saldo|cuanto tengo|balance|total)\b/,
  async run(_text, ctx) {
    const [list, snap] = await Promise.all([
      listAccountsWithBalance(ctx.userId),
      getTotalBalanceInBase(ctx.userId, ctx.baseCurrency),
    ])
    const rows = list.map((a) => ({
      label: a.name,
      value: formatMoney(a.currentBalance, a.currency),
      sub: a.type,
    }))
    const text = list.length === 0
      ? 'Aún no tienes cuentas registradas.'
      : `Saldo total: **${formatMoney(snap.total, ctx.baseCurrency)}**${
          snap.partial ? ' (con conversión parcial)' : ''
        } · ${list.length} ${list.length === 1 ? 'cuenta' : 'cuentas'}.`
    return {
      text,
      cards: list.length === 0 ? [] : [
        {
          kind: 'balance',
          total: formatMoney(snap.total, ctx.baseCurrency),
          currency: ctx.baseCurrency,
          partial: snap.partial,
          rows,
        },
      ],
    }
  },
}

const spendByCategory: Intent = {
  id: 'spend-by-category',
  label: 'Gasto por categoría',
  keywords: ['cuanto gaste', 'gasto en', 'gastos de', 'gaste'],
  matcher: /\b(cuanto gast|gasto[s]? (en|de|del))/,
  async run(text, ctx) {
    const period = detectPeriod(text, ctx.todayIso)
    const rows = await db.execute<{ name: string; total: string }>(sql`
      SELECT
        COALESCE(c.name, 'Sin categoría') AS name,
        SUM(t.amount_base)::text AS total
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ${ctx.userId}
        AND t.deleted_at IS NULL
        AND t.kind = 'expense'
        AND t.date >= ${period.from}
        AND t.date <= ${period.to}
      GROUP BY c.name
      ORDER BY SUM(t.amount_base) DESC
      LIMIT 10
    `)
    const total = rows.reduce(
      (acc, r) => acc + Number.parseFloat(r.total),
      0,
    )
    if (rows.length === 0) {
      return {
        text: `Sin gastos registrados ${period.label}.`,
      }
    }
    return {
      text: `Gasto total ${period.label}: **${formatMoney(total, ctx.baseCurrency)}** en ${rows.length} ${rows.length === 1 ? 'categoría' : 'categorías'}.`,
      cards: [
        {
          kind: 'expense-summary',
          period: period.label,
          total: formatMoney(total, ctx.baseCurrency),
          currency: ctx.baseCurrency,
          rows: rows.map((r) => ({
            label: r.name,
            value: formatMoney(r.total, ctx.baseCurrency),
          })),
        },
      ],
    }
  },
}

const budgetStatus: Intent = {
  id: 'budget-status',
  label: 'Estado de mis presupuestos',
  keywords: ['presupuesto', 'tope', 'limite gasto'],
  matcher: /\b(presupuesto|tope|limite)\b/,
  async run(_text, ctx) {
    const budgets = await listBudgetsWithProgress(ctx.userId)
    if (budgets.length === 0) {
      return {
        text: 'No tienes presupuestos activos. Crea uno desde /presupuestos o pídeme "pónme presupuesto de 500000 en Restaurantes".',
      }
    }
    const overBudget = budgets.filter((b) => b.status !== 'safe')
    const text = overBudget.length === 0
      ? `Todos los ${budgets.length} presupuestos están dentro del rango seguro.`
      : `${overBudget.length} de ${budgets.length} presupuestos requieren atención.`
    return {
      text,
      cards: [
        {
          kind: 'budgets',
          rows: budgets.map((b) => ({
            category: b.categoryName,
            spent: formatMoney(b.spent, ctx.baseCurrency),
            amount: formatMoney(b.amount, ctx.baseCurrency),
            percent: Math.round(b.percent * 100),
            status: b.status,
          })),
        },
      ],
    }
  },
}

const activeInsights: Intent = {
  id: 'active-insights',
  label: 'Lecturas recientes',
  keywords: ['insight', 'lectura', 'detecto', 'anomalia', 'tendencia'],
  matcher: /\b(insight|lectura|detect|anomal|tendenc|qué encontraste)\b/,
  async run(_text, ctx) {
    const list = await listInsightsForUser(ctx.userId, { limit: 5 })
    if (list.length === 0) {
      return {
        text: 'Sin lecturas activas. Si esperas que detecte algo, abre /insights y dispara "Analizar ahora".',
      }
    }
    return {
      text: `Tengo ${list.length} ${list.length === 1 ? 'lectura activa' : 'lecturas activas'}.`,
      cards: [
        {
          kind: 'insights',
          rows: list.map((i) => ({
            id: i.id,
            title: i.title,
            body: i.body,
            severity: i.severity,
          })),
        },
      ],
    }
  },
}

const searchTransactions: Intent = {
  id: 'search-transactions',
  label: 'Buscar transacciones',
  keywords: ['busca', 'encuentra', 'transacciones de', 'pagos a'],
  matcher: /\b(busc|encuentr|transacci(o|ó)n(es)? de|pagos? a)\b/,
  async run(text, ctx) {
    // Heurística simple para extraer el término: lo que viene después de
    // "busca", "encuentra", "pagos a", "transacciones de".
    const n = normalize(text)
    const match = n.match(/(?:busc\w*|encuentr\w*|pagos? a|transacci(?:o|ó)nes? de)\s+(.+)/)
    const query = match?.[1]?.split(/\s+(este mes|el mes pasado|ultim)/)[0]?.trim()
    if (!query || query.length < 2) {
      return {
        text: 'Dime qué buscar — ejemplo: "busca pagos a Uber" o "transacciones de Netflix".',
      }
    }
    const period = detectPeriod(text, ctx.todayIso)
    const rows = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        amount: transactions.amountOriginal,
        currency: transactions.currency,
        amountBase: transactions.amountBase,
        kind: transactions.kind,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.userId, ctx.userId),
          isNull(transactions.deletedAt),
          gte(transactions.date, period.from),
          lte(transactions.date, period.to),
          or(
            ilike(transactions.description, `%${query}%`),
            ilike(transactions.merchant, `%${query}%`),
          )!,
        ),
      )
      .orderBy(sql`${transactions.date} DESC`)
      .limit(15)

    if (rows.length === 0) {
      return {
        text: `Sin coincidencias para "${query}" en ${period.label}.`,
      }
    }
    const totalBase = rows.reduce(
      (a, r) => a + Number.parseFloat(r.amountBase),
      0,
    )
    return {
      text: `${rows.length} ${rows.length === 1 ? 'coincidencia' : 'coincidencias'} para "${query}" en ${period.label} · total **${formatMoney(totalBase, ctx.baseCurrency)}**.`,
      cards: [
        {
          kind: 'transactions',
          rows: rows.map((r) => ({
            id: r.id,
            date: r.date,
            description: r.description,
            amount: formatMoney(r.amount, r.currency),
            currency: r.currency,
            kind: r.kind,
            category: r.categoryName ?? null,
          })),
        },
      ],
    }
  },
}

const monthlySummary: Intent = {
  id: 'monthly-summary',
  label: 'Resumen del mes',
  keywords: ['resumen', 'panorama', 'como voy', 'recap'],
  matcher: /\b(resumen|panorama|como voy|recap)\b/,
  async run(_text, ctx) {
    const period = thisMonth(ctx.todayIso)
    const totals = await db.execute<{ kind: string; total: string }>(sql`
      SELECT kind, SUM(amount_base)::text AS total
      FROM transactions
      WHERE user_id = ${ctx.userId}
        AND deleted_at IS NULL
        AND date >= ${period.from}
        AND date <= ${period.to}
      GROUP BY kind
    `)
    const map = new Map(totals.map((t) => [t.kind, Number.parseFloat(t.total)]))
    const income = map.get('income') ?? 0
    const expense = map.get('expense') ?? 0
    const net = income - expense
    const cashflow = net >= 0 ? 'positivo' : 'negativo'

    return {
      text:
        income === 0 && expense === 0
          ? `Sin movimientos registrados ${period.label}.`
          : `Resumen de ${period.label}: ingresos **${formatMoney(income, ctx.baseCurrency)}**, gastos **${formatMoney(expense, ctx.baseCurrency)}**, flujo ${cashflow} **${formatMoney(net, ctx.baseCurrency)}**.`,
    }
  },
}

const helpIntent: Intent = {
  id: 'help',
  label: 'Qué puedo preguntarte',
  keywords: ['ayuda', 'que puedo', 'que sabes', 'help'],
  matcher: /\b(ayuda|que puedo|que sabes|help|comandos)\b/,
  async run(_text, _ctx) {
    return {
      text:
        'Modo heurístico activo. Cosas que puedo responder ahora:\n\n' +
        '- "Mi saldo total"\n' +
        '- "Cuánto gasté en restaurantes este mes"\n' +
        '- "Cómo van mis presupuestos"\n' +
        '- "Qué lecturas tengo"\n' +
        '- "Busca pagos a Uber"\n' +
        '- "Resumen del mes"\n\n' +
        'Para preguntas en lenguaje natural más libre, conecta tu key de Anthropic desde /ajustes/integraciones.',
    }
  },
}

export const INTENTS: Intent[] = [
  showBalance,
  spendByCategory,
  budgetStatus,
  activeInsights,
  searchTransactions,
  monthlySummary,
  helpIntent,
]

/**
 * Sugerencias clickables que la UI muestra cuando el matcher no encuentra
 * intent. Cada label es una pregunta lista para enviar.
 */
export const SUGGESTED_PROMPTS: Array<{ label: string; query: string }> = [
  { label: 'Cuál es mi saldo', query: 'Cuál es mi saldo total' },
  { label: 'Gasto este mes', query: 'Cuánto gasté este mes' },
  { label: 'Presupuestos en riesgo', query: 'Cómo van mis presupuestos' },
  { label: 'Lecturas recientes', query: 'Qué lecturas tengo' },
  { label: 'Resumen del mes', query: 'Resumen del mes' },
]
