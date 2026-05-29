/**
 * Distancia de Levenshtein iterativa (dos filas). Puro, O(n·m) tiempo, O(min)
 * espacio. Base del fuzzy matching de keywords, categorías y merchants.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  let curr = new Array<number>(b.length + 1)

  for (let i = 0; i < a.length; i++) {
    curr[0] = i + 1
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1
      curr[j + 1] = Math.min(
        // prev[j+1] y curr[j] siempre están definidos por construcción.
        (prev[j + 1] as number) + 1,
        (curr[j] as number) + 1,
        (prev[j] as number) + cost,
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length] as number
}

/**
 * Ratio de similitud 0..1 basado en Levenshtein normalizado por la longitud
 * mayor. 1 = idénticos. Útil para thresholds ("> 0.8").
 */
export function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1
  const dist = levenshtein(a, b)
  const max = Math.max(a.length, b.length)
  return max === 0 ? 1 : 1 - dist / max
}
