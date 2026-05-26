import 'server-only'

export type HeuristicContext = {
  userId: string
  baseCurrency: string
  todayIso: string
}

/**
 * Resultado de un intent. `text` es Markdown plano (Finanzia lo renderea como
 * texto secundario). `cards` son objetos estructurados que la UI dibuja
 * como tarjetas (saldos, gastos por categoría, propuestas).
 *
 * `proposals` son acciones que el usuario puede confirmar (e.g., crear una
 * transacción) — el contrato es el mismo que el de los tools propose-* del
 * LLM, así la UI no distingue.
 */
export type HeuristicResponse = {
  text: string
  cards?: Array<HeuristicCard>
  proposals?: Array<HeuristicProposal>
}

export type HeuristicCard =
  | { kind: 'balance'; total: string; currency: string; partial: boolean; rows: Array<{ label: string; value: string; sub?: string }> }
  | { kind: 'expense-summary'; period: string; total: string; currency: string; rows: Array<{ label: string; value: string }> }
  | { kind: 'budgets'; rows: Array<{ category: string; spent: string; amount: string; percent: number; status: 'safe' | 'warning' | 'exceeded' }> }
  | { kind: 'insights'; rows: Array<{ id: string; title: string; body: string; severity: 'info' | 'notice' | 'warning' }> }
  | { kind: 'transactions'; rows: Array<{ id: string; date: string; description: string; amount: string; currency: string; kind: string; category: string | null }> }

export type HeuristicProposal =
  | {
      kind: 'create-transaction'
      proposal: {
        kind: 'income' | 'expense' | 'transfer'
        accountId: string
        accountName: string
        accountCurrency: string
        transferAccountId: string | null
        transferAccountName: string | null
        categoryId: string | null
        categoryName: string | null
        date: string
        amount: string
        currency: string
        description: string
        merchant: string | null
        notes: string | null
      }
    }

export type Intent = {
  id: string
  /** Lista de keywords para el matcher rápido. */
  keywords: string[]
  /** Score adicional: si el regex match, prioriza. */
  matcher?: RegExp
  /** Etiqueta corta para la UI de sugerencias. */
  label: string
  run(text: string, ctx: HeuristicContext): Promise<HeuristicResponse | null>
}
