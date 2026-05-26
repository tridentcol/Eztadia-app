'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

import { requireCurrentUser } from '@/lib/auth'
import {
  AVAILABLE_SCOPES,
  removeIntegration as removeIntegrationStore,
  upsertIntegration,
  type Provider,
} from '@/lib/integrations/store'

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

const providerEnum = z.enum(['anthropic', 'openai']) as z.ZodType<Provider>

const saveSchema = z.object({
  provider: providerEnum,
  apiKey: z.string().min(8, 'API key inválida'),
  scopes: z.array(z.string()).min(1, 'Selecciona al menos un scope.'),
})

export async function saveIntegration(input: {
  provider: Provider
  apiKey: string
  scopes: string[]
}): Promise<ActionResult> {
  const user = await requireCurrentUser()
  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'validation',
        message: parsed.error.issues[0]?.message ?? 'Datos inválidos.',
      },
    }
  }
  const data = parsed.data

  const allowed = new Set(AVAILABLE_SCOPES[data.provider])
  const invalidScope = data.scopes.find((s) => !allowed.has(s))
  if (invalidScope) {
    return {
      ok: false,
      error: { code: 'invalid_scope', message: `Scope "${invalidScope}" no soportado.` },
    }
  }

  // Sanity check de formato — sin tocar el provider.
  if (data.provider === 'anthropic' && !data.apiKey.startsWith('sk-ant-')) {
    return {
      ok: false,
      error: {
        code: 'invalid_format',
        message: 'La key de Anthropic debe empezar con sk-ant-.',
      },
    }
  }
  if (data.provider === 'openai' && !data.apiKey.startsWith('sk-')) {
    return {
      ok: false,
      error: {
        code: 'invalid_format',
        message: 'La key de OpenAI debe empezar con sk-.',
      },
    }
  }

  try {
    await upsertIntegration({
      userId: user.id,
      provider: data.provider,
      apiKey: data.apiKey,
      scopes: data.scopes,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return { ok: false, error: { code: 'vault_failed', message: msg } }
  }

  revalidatePath('/ajustes/integraciones')
  return { ok: true, data: undefined }
}

export async function removeIntegration(provider: Provider): Promise<ActionResult> {
  const user = await requireCurrentUser()
  if (!['anthropic', 'openai'].includes(provider)) {
    return { ok: false, error: { code: 'validation', message: 'Provider inválido.' } }
  }
  try {
    await removeIntegrationStore({ userId: user.id, provider })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return { ok: false, error: { code: 'vault_failed', message: msg } }
  }
  revalidatePath('/ajustes/integraciones')
  return { ok: true, data: undefined }
}
