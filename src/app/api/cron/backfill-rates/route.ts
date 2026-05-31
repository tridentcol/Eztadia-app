import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { backfillProvisionalRates } from '@/lib/currency/backfill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron diario que reprocesa las transacciones provisionales (moneda extranjera
 * con `exchange_rate` NULL): cuando ya hay tasa, recalcula `amount_base`.
 *
 * Configurado en `vercel.json` a las 07:00 UTC — 1 hora después del cron de
 * `exchange-rates` (06:00), para que las tasas del día ya estén cargadas.
 * Protegido por `Authorization: Bearer ${CRON_SECRET}`.
 */
function isAuthorized(req: Request): boolean {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  return header === `Bearer ${env.CRON_SECRET}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized', message: 'Token inválido.' } },
      { status: 401 },
    )
  }

  const startedAt = Date.now()
  try {
    const { scanned, fixed } = await backfillProvisionalRates()
    return NextResponse.json({
      ok: true,
      data: { scanned, fixed, durationMs: Date.now() - startedAt },
    })
  } catch (err) {
    console.error('[cron/backfill-rates] run failed:', err)
    return NextResponse.json(
      { ok: false, error: { code: 'run_failed', message: 'No se pudo correr el backfill.' } },
      { status: 500 },
    )
  }
}
