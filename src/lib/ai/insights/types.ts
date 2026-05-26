import 'server-only'

import type { NewInsight } from '@/lib/db/schema'

/**
 * Payload que un detector emite — sin `userId` ni `id` (los pone el runner).
 * `signature` va dentro de `data` y se usa para dedupe: dos insights con la
 * misma signature en la misma ventana de 24h NO se duplican.
 */
export type DetectedInsight = Omit<NewInsight, 'id' | 'userId' | 'createdAt'> & {
  /** Identificador determinista del insight. Va en `data.signature`. */
  signature: string
}

export type InsightContext = {
  userId: string
  baseCurrency: string
  /** Fecha 'YYYY-MM-DD' usada como referencia (default: hoy en UTC). */
  today: string
}
