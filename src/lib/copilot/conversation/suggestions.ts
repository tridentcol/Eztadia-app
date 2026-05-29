import type { icons } from '@/lib/design/icons'

export type Suggestion = {
  icon: keyof typeof icons
  title: string
  description: string
  utterance: string
}

const BASE: Suggestion[] = [
  { icon: 'wallet', title: 'Mi saldo', description: 'Cuánto tienes en total', utterance: 'cuál es mi saldo total' },
  { icon: 'trending-down', title: 'En qué gasté', description: 'Desglose del mes', utterance: 'en qué gasté este mes' },
  { icon: 'target', title: 'Presupuestos', description: 'Cómo vas con tus topes', utterance: 'cómo van mis presupuestos' },
  { icon: 'calendar', title: 'Qué se viene', description: 'Próximos pagos', utterance: 'qué pagos se vienen' },
]

/**
 * Sugerencias contextuales según día/hora. PURO (recibe `now`). Antepone la
 * sugerencia más relevante al momento y completa con la base hasta 4, sin
 * duplicar por utterance.
 */
export function getContextualSuggestions(now: Date): Suggestion[] {
  const dow = now.getDay() // 0 = domingo, 1 = lunes
  const hour = now.getHours()
  const dom = now.getDate()

  const priority: Suggestion[] = []

  if (dow === 1 && hour < 12) {
    priority.push({
      icon: 'calendar',
      title: 'Pagos de la semana',
      description: 'Lo que se viene estos días',
      utterance: 'qué pagos se vienen esta semana',
    })
  }
  if (dom <= 3) {
    priority.push({
      icon: 'book-open',
      title: 'Cierre del mes',
      description: 'Cómo cerró el mes pasado',
      utterance: 'cómo cerró el mes pasado',
    })
  }
  if (dom >= 25) {
    priority.push({
      icon: 'target',
      title: 'Presupuestos',
      description: 'Revisa antes de cerrar el mes',
      utterance: 'cómo voy con los presupuestos',
    })
  }

  const seen = new Set<string>()
  const out: Suggestion[] = []
  for (const s of [...priority, ...BASE]) {
    if (seen.has(s.utterance)) continue
    seen.add(s.utterance)
    out.push(s)
    if (out.length === 4) break
  }
  return out
}
