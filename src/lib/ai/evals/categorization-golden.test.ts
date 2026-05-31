import { describe, expect, it } from 'vitest'

import {
  CATEGORIZATION_GOLDEN,
  SYSTEM_CATEGORY_NAMES,
} from './categorization-golden'

/**
 * Buena-formación del golden set (CI). No mide calidad de IA —eso lo hace el
 * runner `scripts/eval-categorization.ts` con keys+DB— pero evita que el dataset
 * se pudra: nombres inexistentes, kind incoherente, cobertura insuficiente.
 */
describe('golden set de categorización', () => {
  const valid = new Set(SYSTEM_CATEGORY_NAMES)

  it('toda categoría esperada existe en el catálogo del sistema', () => {
    const unknown = CATEGORIZATION_GOLDEN.filter((c) => !valid.has(c.expected))
    expect(unknown.map((c) => `${c.description} → ${c.expected}`)).toEqual([])
  })

  it('no hay descripciones duplicadas', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const c of CATEGORIZATION_GOLDEN) {
      const key = c.description.toLowerCase()
      if (seen.has(key)) dupes.push(c.description)
      seen.add(key)
    }
    expect(dupes).toEqual([])
  })

  it('cobertura razonable: ≥30 casos y ≥15 categorías distintas', () => {
    expect(CATEGORIZATION_GOLDEN.length).toBeGreaterThanOrEqual(30)
    const distinct = new Set(CATEGORIZATION_GOLDEN.map((c) => c.expected))
    expect(distinct.size).toBeGreaterThanOrEqual(15)
  })

  it('cubre los tres kinds', () => {
    const kinds = new Set(CATEGORIZATION_GOLDEN.map((c) => c.kind))
    expect(kinds).toEqual(new Set(['income', 'expense', 'transfer']))
  })
})
