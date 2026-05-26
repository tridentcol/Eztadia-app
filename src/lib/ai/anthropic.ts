import 'server-only'
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic'

import { env } from '@/lib/env'

/**
 * Cliente Anthropic lazy. Modelo por default: Claude Sonnet 4.6 — balance
 * costo/calidad para categorización few-shot y copiloto.
 */
let cached: AnthropicProvider | null = null

export function getAnthropic(): AnthropicProvider | null {
  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  if (cached) return cached
  cached = createAnthropic({ apiKey })
  return cached
}

export const CLAUDE_MODEL_ID = 'claude-sonnet-4-6'
