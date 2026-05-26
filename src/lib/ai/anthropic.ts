import 'server-only'
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic'

import { env } from '@/lib/env'
import { getUserApiKey } from '@/lib/integrations/store'

/**
 * Cliente Anthropic lazy. Resolución:
 *
 *  1. Key del usuario en Vault (`user_integrations.anthropic`).
 *  2. `AI_GATEWAY_API_KEY` env (operador) — Vercel AI Gateway con baseURL.
 *  3. `ANTHROPIC_API_KEY` env (operador).
 *
 * Modelo por default: Claude Sonnet 4.6. Para generación estructurada y
 * para el copiloto.
 */
const cache = new Map<string, AnthropicProvider>()

export type GetAnthropicOptions = {
  userId?: string
}

export async function getAnthropic(
  opts: GetAnthropicOptions = {},
): Promise<AnthropicProvider | null> {
  if (opts.userId) {
    const userKey = await getUserApiKey({
      userId: opts.userId,
      provider: 'anthropic',
      requiredScope: 'chat',
    })
    if (userKey) return getOrCreate(`user:${opts.userId}`, userKey)
  }

  const gatewayKey = env.AI_GATEWAY_API_KEY
  if (gatewayKey) {
    return getOrCreate('gateway', gatewayKey, {
      baseURL: 'https://gateway.ai.vercel.com/v1/anthropic',
    })
  }

  const opKey = env.ANTHROPIC_API_KEY
  if (opKey) return getOrCreate('operator', opKey)

  return null
}

function getOrCreate(
  cacheKey: string,
  apiKey: string,
  extra: { baseURL?: string } = {},
): AnthropicProvider {
  const k = cacheKey + (extra.baseURL ?? '')
  const existing = cache.get(k)
  if (existing) return existing
  const created = createAnthropic({ apiKey, ...extra })
  cache.set(k, created)
  return created
}

export const CLAUDE_MODEL_ID = 'claude-sonnet-4-6'
