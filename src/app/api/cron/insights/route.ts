import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { getActiveUserIds, runDetectorsForUser } from '@/lib/ai/insights'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Permitimos hasta 60s por invocación — la recomendación LLM puede tardar.
export const maxDuration = 60

/**
 * Cron diario que corre los 4 detectores de insights por usuario activo.
 * Configurado en `vercel.json` como `0 5 * * *` (1 hora antes que rates).
 *
 * Protegido por `Authorization: Bearer ${CRON_SECRET}` — Vercel Cron lo
 * inyecta automáticamente.
 */
function isAuthorized(req: Request): boolean {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header) return false
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
    const userIds = await getActiveUserIds()
    const results = []
    let failed = 0
    for (const userId of userIds) {
      try {
        const result = await runDetectorsForUser(userId)
        results.push(result)
      } catch (err) {
        console.error(`[cron/insights] error para ${userId}:`, err)
        failed++
      }
    }
    return NextResponse.json({
      ok: true,
      data: {
        users: userIds.length,
        generated: results.reduce((a, r) => a + r.generated, 0),
        skipped: results.reduce((a, r) => a + r.skipped, 0),
        failed,
        durationMs: Date.now() - startedAt,
      },
    })
  } catch (err) {
    console.error('[cron/insights] run failed:', err)
    return NextResponse.json(
      { ok: false, error: { code: 'run_failed', message: 'No se pudieron generar los insights.' } },
      { status: 500 },
    )
  }
}
