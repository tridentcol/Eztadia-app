import type { Metadata } from 'next'

import { CopilotChat } from '@/components/app/copilot-chat'

export const metadata: Metadata = {
  title: 'Copiloto',
}

export default function CopilotPage() {
  return <CopilotChat />
}
