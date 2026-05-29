import { normalize } from '../normalize'

/**
 * Extrae el término de búsqueda libre tras un verbo de búsqueda ES. Puro.
 * "busca pagos a uber este mes" → "pagos a uber". Recorta sufijos temporales
 * comunes para no contaminar el ILIKE.
 */
const TRIGGER =
  /(?:busc\w*|encuentr\w*|pagos? a|transacci(?:o|on)es? de|movimientos? de)\s+(.+)/

const PERIOD_TAIL = /\s+(este mes|el mes pasado|esta semana|hoy|ayer|ultim\w*|de el ano\w*).*$/

export function extractQuery(input: string): string | null {
  const n = normalize(input)
  const m = n.match(TRIGGER)
  if (!m) return null
  let q = (m[1] as string).replace(PERIOD_TAIL, '').trim()
  // quita conectores iniciales redundantes ("a uber" tras "pagos a")
  q = q.replace(/^(a|de|en|el|la|los|las)\s+/, '').trim()
  return q.length >= 2 ? q : null
}
