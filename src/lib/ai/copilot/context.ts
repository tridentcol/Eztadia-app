import 'server-only'

/**
 * Contexto que reciben los tools — user_id del autenticado y baseCurrency
 * del perfil. Se inyecta por closure al construir el set de tools, para
 * evitar que el LLM pueda interpolar otro userId. Defensa en profundidad
 * sobre RLS.
 */
export type CopilotContext = {
  userId: string
  baseCurrency: string
}
