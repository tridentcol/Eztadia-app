import { eq } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { profiles } from '@/lib/db/schema'
import { getActiveSavingsPlan } from '@/app/(app)/ajustes/perfil-financiero/actions'
import { PerfilFinancieroClient } from '@/app/(app)/ajustes/perfil-financiero/perfil-financiero-client'

type Props = { userId: string }

export async function PerfilSection({ userId }: Props) {
  const [profile, activePlan] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(profiles.userId, userId) }),
    getActiveSavingsPlan(userId),
  ])

  const ai = (profile?.aiProfile as Record<string, unknown> | null) ?? {}
  const mainGoal = typeof ai.mainGoal === 'string' ? ai.mainGoal : ''
  const riskTolerance =
    ai.riskTolerance === 'conservador' ||
    ai.riskTolerance === 'moderado' ||
    ai.riskTolerance === 'agresivo'
      ? ai.riskTolerance
      : null

  return (
    <PerfilFinancieroClient
      baseCurrency={(profile?.baseCurrency ?? 'COP') as 'COP' | 'USD' | 'EUR' | 'MXN'}
      locale={(profile?.locale ?? 'es-CO') as 'es-CO' | 'es-ES' | 'en-US' | 'es-MX'}
      activePlan={activePlan ?? null}
      isOnboarded={!!profile?.onboardedAt}
      mainGoal={mainGoal}
      riskTolerance={riskTolerance}
    />
  )
}
