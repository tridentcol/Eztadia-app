'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'

import { requireCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { profiles, savingsPlans } from '@/lib/db/schema'

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

const onboardingSchema = z.object({
  baseCurrency: z.enum(['COP', 'USD', 'EUR', 'MXN']),
  locale: z.enum(['es-CO', 'es-ES', 'en-US', 'es-MX']),
  incomeRange: z
    .enum(['under_2m', '2m_5m', '5m_10m', '10m_20m', 'over_20m', 'prefer_not'])
    .optional()
    .nullable(),
  method: z.enum(['percentage_income', 'fixed_amount', 'none', 'other']),
  params: z
    .union([
      z.object({ percent: z.number().min(1).max(100) }),
      z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/), frequency: z.literal('monthly') }),
    ])
    .optional()
    .nullable(),
})

export type OnboardingInput = z.input<typeof onboardingSchema>

export async function completeOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const user = await requireCurrentUser()
  const parsed = onboardingSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos.' } }
  }

  const { baseCurrency, locale, incomeRange, method, params } = parsed.data

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.profiles.findFirst({
        where: eq(profiles.userId, user.id),
      })

      const aiProfile = {
        ...(existing?.aiProfile as Record<string, unknown> | null ?? {}),
        ...(incomeRange ? { incomeRange } : {}),
      }

      await tx
        .update(profiles)
        .set({
          baseCurrency,
          locale,
          aiProfile,
          onboardedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, user.id))

      await tx.insert(savingsPlans).values({
        userId: user.id,
        method,
        params: params ?? null,
        activeFrom: new Date().toISOString().slice(0, 10),
      })
    })

    revalidatePath('/', 'layout')
    return { ok: true, data: undefined }
  } catch {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Error al guardar. Intenta de nuevo.' } }
  }
}

const updatePlanSchema = z.object({
  method: z.enum(['percentage_income', 'fixed_amount', 'none', 'other']),
  params: z
    .union([
      z.object({ percent: z.number().min(1).max(100) }),
      z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/), frequency: z.literal('monthly') }),
    ])
    .optional()
    .nullable(),
})

export type UpdatePlanInput = z.input<typeof updatePlanSchema>

export async function updateSavingsPlan(input: UpdatePlanInput): Promise<ActionResult> {
  const user = await requireCurrentUser()
  const parsed = updatePlanSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos.' } }
  }

  const today = new Date().toISOString().slice(0, 10)

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(savingsPlans)
        .set({ activeTo: today })
        .where(and(eq(savingsPlans.userId, user.id), isNull(savingsPlans.activeTo)))

      await tx.insert(savingsPlans).values({
        userId: user.id,
        method: parsed.data.method,
        params: parsed.data.params ?? null,
        activeFrom: today,
      })
    })

    revalidatePath('/ajustes/perfil-financiero')
    return { ok: true, data: undefined }
  } catch {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Error al guardar. Intenta de nuevo.' } }
  }
}

export async function getActiveSavingsPlan(userId: string) {
  return db.query.savingsPlans.findFirst({
    where: and(eq(savingsPlans.userId, userId), isNull(savingsPlans.activeTo)),
    orderBy: (t, { desc }) => [desc(t.activeFrom)],
  })
}

const personaSchema = z.object({
  mainGoal: z.string().max(140).nullable().optional(),
  riskTolerance: z.enum(['conservador', 'moderado', 'agresivo']).nullable().optional(),
})

export type FinancialPersonaInput = z.input<typeof personaSchema>

/**
 * Guarda señales de personalización del usuario en `profiles.aiProfile`
 * (mainGoal, riskTolerance). El profile snapshot del copiloto las inyecta para
 * dar consejo más personalizado. Reemplaza ambos campos según el form (vacío =
 * borrar). El ingreso ya se captura por separado en `aiProfile.incomeRange`.
 */
export async function updateFinancialPersona(
  input: FinancialPersonaInput,
): Promise<ActionResult> {
  const user = await requireCurrentUser()
  const parsed = personaSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos.' } }
  }
  const { mainGoal, riskTolerance } = parsed.data

  try {
    // Transacción + lock de fila: el read-modify-write de aiProfile se serializa
    // con otros writers (p. ej. updateCopilotPreferences) y evita lost-update.
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ aiProfile: profiles.aiProfile })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .for('update')
      const aiProfile: Record<string, unknown> = {
        ...((row?.aiProfile as Record<string, unknown> | null) ?? {}),
      }
      if (mainGoal && mainGoal.trim()) aiProfile.mainGoal = mainGoal.trim()
      else delete aiProfile.mainGoal
      if (riskTolerance) aiProfile.riskTolerance = riskTolerance
      else delete aiProfile.riskTolerance

      await tx
        .update(profiles)
        .set({ aiProfile, updatedAt: new Date() })
        .where(eq(profiles.userId, user.id))
    })
  } catch {
    return { ok: false, error: { code: 'DB_ERROR', message: 'Error al guardar. Intenta de nuevo.' } }
  }

  revalidatePath('/ajustes')
  return { ok: true, data: undefined }
}
