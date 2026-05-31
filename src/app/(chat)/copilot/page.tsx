import type { Metadata } from 'next'

import { requireCurrentUser } from '@/lib/auth'
import { getProfile } from '@/lib/db/queries/profile'
import { parsePersona } from '@/lib/ai/copilot/persona'
import { CopilotChat } from '@/components/app/copilot-chat'

export const metadata: Metadata = {
  title: 'Copiloto',
}

export default async function CopilotPage() {
  const user = await requireCurrentUser()
  const profile = await getProfile(user.id)
  const ai = (profile?.aiProfile as Record<string, unknown> | null) ?? {}

  const persona = parsePersona(ai.persona)
  const copilot = (ai.copilot as Record<string, unknown> | null) ?? {}

  return (
    <CopilotChat
      toneProps={{
        literacy: persona?.literacy ?? null,
        commStyle: persona?.commStyle ?? null,
        moneyStyle: persona?.moneyStyle ?? null,
        horizon: persona?.horizon ?? null,
        focus: persona?.focus ?? [],
      }}
      toneIntroSeen={copilot.toneIntroSeen === true}
    />
  )
}
