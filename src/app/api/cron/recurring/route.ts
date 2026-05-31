import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { listUsersWithDueRules, runRecurringForUser } from '@/lib/recurring/tick'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: Request): boolean {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  return header === `Bearer ${env.CRON_SECRET}`
}

/**
 * Cron diario que procesa recurring rules vencidas para cada usuario. Catch-up:
 * `runRecurringForUser` itera hasta alcanzar today, así que si el cron se
 * cayó N días, las rules se ejecutan N veces y next_run avanza el equivalente.
 *
 * Configurado en vercel.json como `0 4 * * *` (1h antes que insights).
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized', message: 'Token inválido.' } },
      { status: 401 },
    )
  }
  const startedAt = Date.now()
  const today = new Date().toISOString().slice(0, 10)
  try {
    const userIds = await listUsersWithDueRules(today)
    const results = []
    let failed = 0
    for (const userId of userIds) {
      try {
        const r = await runRecurringForUser(userId, today)
        results.push({ userId, ...r })
      } catch (err) {
        console.error(`[cron/recurring] error para ${userId}:`, err)
        failed++
      }
    }
    return NextResponse.json({
      ok: true,
      data: {
        users: userIds.length,
        processed: results.reduce((a, r) => a + r.processed, 0),
        created: results.reduce((a, r) => a + r.created, 0),
        failed,
        durationMs: Date.now() - startedAt,
      },
    })
  } catch (err) {
    console.error('[cron/recurring] run failed:', err)
    return NextResponse.json(
      { ok: false, error: { code: 'run_failed', message: 'No se pudieron procesar las recurrencias.' } },
      { status: 500 },
    )
  }
}
