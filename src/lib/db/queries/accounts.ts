import 'server-only'
import { sql } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import type { CurrencyCode } from '@/lib/currency/currencies'

export type AccountListItem = {
  id: string
  name: string
  type:
    | 'checking'
    | 'savings'
    | 'credit_card'
    | 'cash'
    | 'investment'
    | 'crypto'
    | 'other'
  currency: CurrencyCode
  initialBalance: string
  creditLimit: string | null
  archived: boolean
  color: string | null
  icon: string | null
  createdAt: Date
  /** Saldo computado en la moneda original de la cuenta. */
  currentBalance: string
}

/**
 * Lista cuentas del usuario con saldo computado a partir de las transacciones.
 *
 * Reglas de cómputo (todas usan amount_original; se asume que cada transacción
 * en una cuenta está en la misma moneda que la cuenta):
 *  - income      → suma amount.
 *  - expense     → resta amount.
 *  - transfer    → resta de account_id, suma en transfer_account_id.
 *
 * Las transacciones con deleted_at NOT NULL se excluyen.
 */
export async function listAccountsWithBalance(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<AccountListItem[]> {
  const includeArchived = options.includeArchived ?? false

  const rows = await db.execute<{
    id: string
    name: string
    type: AccountListItem['type']
    currency: string
    initial_balance: string
    credit_limit: string | null
    archived: boolean
    color: string | null
    icon: string | null
    created_at: Date
    current_balance: string
  }>(sql`
    WITH deltas AS (
      SELECT
        account_id,
        CASE
          WHEN kind = 'income' THEN amount_original
          WHEN kind = 'expense' THEN -amount_original
          WHEN kind = 'transfer' THEN -amount_original
        END AS delta,
        currency
      FROM transactions
      WHERE user_id = ${userId}
        AND deleted_at IS NULL

      UNION ALL

      SELECT
        transfer_account_id AS account_id,
        amount_original AS delta,
        currency
      FROM transactions
      WHERE user_id = ${userId}
        AND deleted_at IS NULL
        AND kind = 'transfer'
        AND transfer_account_id IS NOT NULL
    )
    SELECT
      a.id,
      a.name,
      a.type,
      a.currency,
      a.initial_balance,
      a.credit_limit,
      a.archived,
      a.color,
      a.icon,
      a.created_at,
      (a.initial_balance + COALESCE(SUM(d.delta) FILTER (WHERE d.currency = a.currency), 0))::text AS current_balance
    FROM accounts a
    LEFT JOIN deltas d ON d.account_id = a.id
    WHERE a.user_id = ${userId}
      ${includeArchived ? sql`` : sql`AND a.archived = false`}
    GROUP BY a.id
    ORDER BY a.archived ASC, a.created_at DESC
  `)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    currency: r.currency as CurrencyCode,
    initialBalance: r.initial_balance,
    creditLimit: r.credit_limit,
    archived: r.archived,
    color: r.color,
    icon: r.icon,
    createdAt: r.created_at,
    currentBalance: r.current_balance,
  }))
}

/**
 * Saldo total agregado en la moneda base del perfil del usuario.
 * Usa amount_base para sumar a través de cuentas con monedas distintas.
 */
export async function getTotalBalanceInBase(userId: string): Promise<string> {
  const rows = await db.execute<{ total: string }>(sql`
    WITH deltas AS (
      SELECT
        CASE
          WHEN kind = 'income' THEN amount_base
          WHEN kind = 'expense' THEN -amount_base
          WHEN kind = 'transfer' THEN 0
        END AS delta
      FROM transactions
      WHERE user_id = ${userId}
        AND deleted_at IS NULL
    ),
    initials AS (
      SELECT COALESCE(SUM(initial_balance), 0) AS total
      FROM accounts
      WHERE user_id = ${userId}
        AND archived = false
    )
    SELECT (
      (SELECT total FROM initials) + COALESCE(SUM(delta), 0)
    )::text AS total
    FROM deltas
  `)

  return rows[0]?.total ?? '0'
}
