import * as Sentry from '@sentry/nextjs'

import { env } from '@/lib/env'

/**
 * Init de Sentry para el runtime edge (middleware de Clerk). Mismo criterio que
 * el config de server: no-op sin DSN, sin PII.
 */
Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
  sendDefaultPii: false,
})
