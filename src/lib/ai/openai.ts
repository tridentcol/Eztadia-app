import 'server-only'
import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai'

import { env } from '@/lib/env'

/**
 * Cliente OpenAI lazy. Sólo se usa para embeddings — el modelo
 * `text-embedding-3-small` produce vectores de 1536 dimensiones, que matchea
 * la columna `embedding vector(1536)` y el índice HNSW.
 *
 * Para generación de texto (categorización fallback, copiloto) usamos
 * Anthropic vía `@/lib/ai/anthropic`. OpenAI queda relegada a embeddings.
 */
let cached: OpenAIProvider | null = null

export function getOpenAI(): OpenAIProvider | null {
  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) return null
  if (cached) return cached
  cached = createOpenAI({ apiKey })
  return cached
}

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMS = 1536
