import * as Sentry from '@sentry/nextjs'

/**
 * Hook de instrumentación de Next.js. Carga el init de Sentry según el runtime
 * y reexporta `onRequestError` para capturar errores no manejados de RSC,
 * Server Actions y route handlers.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
