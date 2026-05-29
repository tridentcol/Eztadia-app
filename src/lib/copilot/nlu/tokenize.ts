import { normalize, singularize } from './normalize'

/** Stopwords ES que no aportan señal al matcher. */
const STOPWORDS = new Set([
  'a', 'de', 'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'en', 'que',
  'me', 'mi', 'mis', 'se', 'su', 'sus', 'lo', 'le', 'es', 'por', 'con', 'para',
  'al', 'del', 'tu', 'tus', 'cual', 'cuales',
])

export type Tokens = {
  /** Texto normalizado completo. */
  text: string
  /** Palabras normalizadas, sin stopwords. */
  words: string[]
  /** Palabras singularizadas (para fuzzy matching de keywords). */
  stems: string[]
  /** Bigramas de palabras consecutivas (incluye stopwords para frases). */
  bigrams: string[]
}

/**
 * Tokeniza una utterance: palabras + stems singularizados + bigramas. Puro.
 * Los bigramas conservan stopwords porque frases como "mes pasado" o "cuanto
 * tengo" dependen de ellas.
 */
export function tokenize(input: string): Tokens {
  const text = normalize(input)
  const allWords = text.split(' ').filter(Boolean)
  const words = allWords.filter((w) => !STOPWORDS.has(w))
  const stems = words.map(singularize)
  const bigrams: string[] = []
  for (let i = 0; i < allWords.length - 1; i++) {
    bigrams.push(`${allWords[i]} ${allWords[i + 1]}`)
  }
  return { text, words, stems, bigrams }
}
