import 'server-only'
import { embed } from 'ai'

import { getOpenAI, EMBEDDING_MODEL } from './openai'

/**
 * Normaliza el texto antes de embeddear. Bancos pegan ruido (códigos, fechas,
 * referencias) que degrada el embedding. Removemos:
 *  - prefijos típicos LATAM: "COMPRA-", "PAGO-", "COD:", "REF:", "POS-", "CR-".
 *  - secuencias largas de dígitos (referencias, NITs).
 *  - exceso de whitespace.
 *  - tokens vacíos.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(compra|pago|cod|ref|cr|pos|trf|transf)\s*[:\-#]?\s*/g, ' ')
    .replace(/\b\d{6,}\b/g, ' ')
    .replace(/[*]{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Construye el input del embedding combinando descripción + merchant si está
 * presente. Returna `null` si tras normalizar queda string vacío.
 */
export function buildEmbeddingInput(
  description: string,
  merchant: string | null,
): string | null {
  const desc = normalize(description ?? '')
  const merch = normalize(merchant ?? '')
  const parts = [desc, merch].filter((s) => s.length > 0)
  if (parts.length === 0) return null
  return parts.join(' · ')
}

/**
 * Genera el embedding de una transacción. Si OpenAI no está configurada (sin
 * `OPENAI_API_KEY`), devuelve `null` y el caller decide saltarse la
 * categorización IA.
 */
export async function embedTransaction(
  description: string,
  merchant: string | null,
  options: { userId?: string } = {},
): Promise<number[] | null> {
  const provider = await getOpenAI({ userId: options.userId, scope: 'embed' })
  if (!provider) return null
  const input = buildEmbeddingInput(description, merchant)
  if (!input) return null
  try {
    const { embedding } = await embed({
      model: provider.textEmbedding(EMBEDDING_MODEL),
      value: input,
    })
    return embedding
  } catch (err) {
    console.error('[embed] falló:', err)
    return null
  }
}

/**
 * Helper para serializar un vector a formato pgvector literal (`'[1,2,3]'`).
 * Drizzle acepta arrays directamente pero el SQL crudo (kNN con `<=>`) requiere
 * el literal.
 */
export function toPgvectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}
