import * as Sentry from '@sentry/nextjs'

import { env } from '@/lib/env'

/**
 * Init de Sentry para el runtime Node.js (RSC, Server Actions, route handlers,
 * crons). Se importa desde `instrumentation.ts`.
 *
 * `SENTRY_DSN` es opcional: sin DSN, Sentry queda deshabilitado (no-op) — útil
 * en dev/local. `sendDefaultPii: false` es deliberado: las transacciones son
 * datos financieros sensibles y no deben salir al proveedor.
 */
Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
  sendDefaultPii: false,
})
