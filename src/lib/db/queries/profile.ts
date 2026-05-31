import 'server-only'
import { cache } from 'react'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { profiles, type Profile } from '@/lib/db/schema'

/**
 * Perfil del usuario, memoizado por request con `React.cache`.
 *
 * El layout `(app)` lee el perfil en cada navegación (onboarding) y casi toda
 * page vuelve a leerlo (baseCurrency). Compartir esta función deduplica ambas
 * lecturas en un solo query por request.
 */
export const getProfile = cache(
  async (userId: string): Promise<Profile | null> => {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    })
    return profile ?? null
  },
)
