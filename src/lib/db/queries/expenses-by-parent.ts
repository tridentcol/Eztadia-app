import 'server-only'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import type { CurrencyCode } from '@/lib/currency/currencies'

export type ExpensesByParentEntry = {
  parentId: string
  parentName: string
  parentIcon: string | null
  /** Total ya convertido a la moneda base. */
  totalBase: string
  /** Cuántas transacciones contribuyeron. */
  count: number
}

export type ExpensesByParentResult = {
  /** Mes que se analizó (YYYY-MM). */
  period: string
  /** Total general en base currency, suma de todas las parents. */
  grandTotal: string
  /** Categorías padre ordenadas por gasto descendente. */
  entries: ExpensesByParentEntry[]
}

/**
 * Agrega gastos del mes especificado (default: actual) por categoría padre,
 * filtrando solo las categorías que tienen movimientos en el período.
 *
 * Una categoría sin parentId se considera ella misma como "padre" (raíz).
 * Las subcategorías se atribuyen a su padre raíz.
 *
 * Los montos se suman en `amount_base` (ya convertido al momento de registrar
 * la transacción), por lo que el resultado está en la moneda base del usuario.
 */
export async function getExpensesByParentCategory(
  userId: string,
  baseCurrency: CurrencyCode,
  options: { month?: string } = {},
): Promise<ExpensesByParentResult> {
  // Calcular rango del mes (YYYY-MM-01 a último día del mes).
  const monthInput = options.month ?? new Date().toISOString().slice(0, 7)
  const [yearStr, monthStr] = monthInput.split('-')
  const year = Number.parseInt(yearStr ?? '0', 10)
  const month = Number.parseInt(monthStr ?? '0', 10)
  const from = `${monthInput}-01`
  // Último día del mes: el día 0 del mes siguiente.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const to = `${monthInput}-${String(lastDay).padStart(2, '0')}`

  const rows = await db.execute<{
    parent_id: string
    parent_name: string
    parent_icon: string | null
    total_base: string
    count: number
  }>(sql`
    WITH parent_resolved AS (
      SELECT
        t.id AS tx_id,
        t.amount_base,
        COALESCE(c.parent_id, c.id) AS root_id
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ${userId}
        AND t.deleted_at IS NULL
        AND t.kind = 'expense'
        AND t.date >= ${from}
        AND t.date <= ${to}
        AND t.category_id IS NOT NULL
    )
    SELECT
      pr.root_id AS parent_id,
      c.name AS parent_name,
      c.icon AS parent_icon,
      SUM(pr.amount_base)::text AS total_base,
      COUNT(*)::int AS count
    FROM parent_resolved pr
    JOIN categories c ON c.id = pr.root_id
    GROUP BY pr.root_id, c.name, c.icon
    ORDER BY SUM(pr.amount_base) DESC
  `)

  const entries: ExpensesByParentEntry[] = rows.map((r) => ({
    parentId: r.parent_id,
    parentName: r.parent_name,
    parentIcon: r.parent_icon,
    totalBase: r.total_base,
    count: r.count,
  }))

  const grandTotal = entries
    .reduce((sum, e) => sum + Number.parseFloat(e.totalBase), 0)
    .toFixed(2)

  return {
    period: monthInput,
    grandTotal,
    entries,
  }
}
