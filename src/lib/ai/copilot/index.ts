import 'server-only'
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai'

import { CLAUDE_MODEL_ID, getAnthropic } from '../anthropic'
import { buildCopilotTools } from './tools'
import { buildSystemPrompt } from './system-prompt'
import type { CopilotContext } from './context'

export type RunChatParams = {
  ctx: CopilotContext
  messages: UIMessage[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFinish?: (event: any) => void | Promise<void>
}

/**
 * Construye y dispara el streaming del copiloto. Si no hay
 * `ANTHROPIC_API_KEY`, devuelve null — el caller decide cómo responder.
 *
 * `stopWhen` limita los pasos del LLM a 5 (incluye tool calls + texto final).
 * Suficiente para encadenar 2-3 tools y responder, sin riesgo de loops.
 */
export async function runCopilotChat(params: RunChatParams) {
  const provider = getAnthropic()
  if (!provider) return null

  const tools = buildCopilotTools(params.ctx)
  const todayIso = new Date().toISOString().slice(0, 10)

  return streamText({
    model: provider(CLAUDE_MODEL_ID),
    system: buildSystemPrompt({
      baseCurrency: params.ctx.baseCurrency,
      todayIso,
    }),
    messages: await convertToModelMessages(params.messages),
    tools,
    stopWhen: stepCountIs(5),
    onFinish: params.onFinish,
  })
}
