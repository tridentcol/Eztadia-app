/**
 * Normalización de texto ES para el matcher del copiloto. Puro, sin estado.
 *
 * - lowercase + strip de diacríticos (NFD) — "café" y "cafe" colapsan.
 * - quita puntuación, colapsa espacios.
 * - expande contracciones "al" → "a el", "del" → "de el" para que los
 *   patrones temporales ("del mes pasado") y de cuenta no se rompan.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:()"']/g, ' ')
    .replace(/\bdel\b/g, 'de el')
    .replace(/\bal\b/g, 'a el')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Singulariza una palabra con reglas simples del español. Conservadora: sólo
 * recorta sufijos plurales comunes para que "restaurantes" matchee
 * "restaurante" sin un diccionario completo.
 *
 * - "-ces" → "-z"  (luces → luz)
 * - "-es"  → ""    (meses → mes) cuando deja una raíz de >=3 chars
 * - "-s"   → ""    (gastos → gasto) cuando deja una raíz de >=3 chars
 */
export function singularize(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ces')) return `${word.slice(0, -3)}z`
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2)
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}
