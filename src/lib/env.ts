import { z } from 'zod'

/**
 * Server-side environment variables.
 * Validados en runtime. Si falta uno obligatorio, la app no inicia.
 */
const serverSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Auth
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),

  // AI
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Trigger.dev
  TRIGGER_API_KEY: z.string().min(1).optional(),
  TRIGGER_API_URL: z.string().url().optional(),

  // Exchange rates
  EXCHANGE_RATE_API_KEY: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),

  // Cron
  CRON_SECRET: z.string().min(32),
})

/**
 * Public (NEXT_PUBLIC_*) environment variables.
 * Disponibles en cliente y servidor.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
})

const isServer = typeof window === 'undefined'

const publicEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
}

const publicParsed = publicSchema.safeParse(publicEnv)

if (!publicParsed.success) {
  console.error('Variables públicas inválidas:', z.treeifyError(publicParsed.error))
  throw new Error('Variables públicas inválidas. Revisa .env.local.')
}

type ServerEnv = z.infer<typeof serverSchema>
type PublicEnv = z.infer<typeof publicSchema>
type Env = ServerEnv & PublicEnv

let serverParsed: ServerEnv | null = null

if (isServer) {
  const result = serverSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Variables de entorno inválidas:', z.treeifyError(result.error))
    throw new Error('Variables de entorno inválidas. Revisa .env.local.')
  }
  serverParsed = result.data
}

export const env: Env = new Proxy({} as Env, {
  get(_target, key: string) {
    if (key.startsWith('NEXT_PUBLIC_')) {
      return publicParsed.data[key as keyof PublicEnv]
    }
    if (!isServer) {
      throw new Error(
        `Intento de leer la variable de servidor "${key}" desde el cliente.`,
      )
    }
    return serverParsed?.[key as keyof ServerEnv]
  },
})
