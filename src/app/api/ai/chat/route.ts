import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { requireCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { conversations, messages, profiles } from '@/lib/db/schema'
import { runCopilotChat } from '@/lib/ai/copilot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 60s tope — incluye múltiples tool calls + texto final.
export const maxDuration = 60

const bodySchema = z.object({
  id: z.string().uuid().optional(),
  messages: z.array(z.any()).min(1),
})

/**
 * Endpoint del copiloto. Recibe `{ id?, messages }` desde `useChat` y
 * devuelve un `UIMessageStream`. Persiste el turno completo (user input +
 * respuesta completa) en `conversations` + `messages` al finalizar.
 *
 * Auth: Clerk en middleware. Si no hay `ANTHROPIC_API_KEY`, devuelve 503.
 */
export async function POST(req: Request) {
  let user
  try {
    user = await requireCurrentUser()
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized', message: 'No autenticado.' } },
      { status: 401 },
    )
  }

  let parsedBody: z.infer<typeof bodySchema>
  try {
    const raw = await req.json()
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'validation', message: 'Body inválido.' } },
        { status: 400 },
      )
    }
    parsedBody = parsed.data
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'validation', message: 'JSON inválido.' } },
      { status: 400 },
    )
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, user.id),
  })
  const baseCurrency = profile?.baseCurrency ?? 'COP'

  let conversationId = parsedBody.id
  if (!conversationId) {
    const [row] = await db
      .insert(conversations)
      .values({ userId: user.id, title: null })
      .returning({ id: conversations.id })
    conversationId = row?.id
  }
  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: { code: 'persist_failed', message: 'No se pudo crear la conversación.' } },
      { status: 500 },
    )
  }

  // Persistimos sólo el ÚLTIMO mensaje del usuario antes de invocar el LLM
  // — el historial previo ya está en DB de turnos anteriores.
  const incoming = parsedBody.messages
  const lastUserMessage = [...incoming].reverse().find((m) => m?.role === 'user')
  if (lastUserMessage) {
    await db.insert(messages).values({
      conversationId,
      role: 'user',
      content: lastUserMessage as Record<string, unknown>,
    })
  }

  const result = await runCopilotChat({
    ctx: { userId: user.id, baseCurrency },
    messages: incoming as Parameters<typeof runCopilotChat>[0]['messages'],
    onFinish: async (event) => {
      try {
        await db.insert(messages).values({
          conversationId: conversationId!,
          role: 'assistant',
          content: {
            text: event.text ?? null,
            finishReason: event.finishReason ?? null,
            toolCalls: event.toolCalls ?? null,
            toolResults: event.toolResults ?? null,
          } as Record<string, unknown>,
        })
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId!))
      } catch (err) {
        console.error('[copilot] persist falló:', err)
      }
    },
  })

  if (!result) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'no_provider',
          message:
            'El copiloto necesita ANTHROPIC_API_KEY configurada para responder.',
        },
      },
      { status: 503 },
    )
  }

  // Devolvemos el UIMessageStream y propagamos el conversationId vía header.
  const response = result.toUIMessageStreamResponse()
  response.headers.set('x-conversation-id', conversationId)
  return response
}
