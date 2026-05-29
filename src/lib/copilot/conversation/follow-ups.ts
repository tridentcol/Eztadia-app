import type { FollowUpChip } from '../render/answer-ast'
import type { IntentId, Slots } from '../intents/types'

/**
 * Sugerencias conversacionales por intent. PURO. Las utterances elípticas
 * ("y el mes pasado") las resuelve el reducer reusando el intent previo, así
 * que un follow-up puede continuar el hilo sin repetir el verbo. Máximo 3.
 */
const STATIC: Partial<Record<IntentId, FollowUpChip[]>> = {
  'show-balance': [
    { label: '¿En qué se está yendo?', utterance: 'en qué gasté este mes' },
    { label: '¿Próximos pagos?', utterance: 'qué pagos se vienen' },
    { label: '¿Qué me recomendás?', utterance: 'qué me recomiendas' },
  ],
  'spend-by-category': [
    { label: '¿Y el mes pasado?', utterance: 'y el mes pasado' },
    { label: 'Top comercios', utterance: 'dónde gasté más este mes' },
    { label: 'Ver movimientos', utterance: 'busca movimientos de este mes' },
  ],
  'budget-status': [
    { label: '¿En qué gasté?', utterance: 'en qué gasté este mes' },
    { label: '¿Qué me recomendás?', utterance: 'qué me recomiendas' },
  ],
  advice: [
    { label: 'Mi saldo', utterance: 'cuál es mi saldo total' },
    { label: '¿En qué gasté?', utterance: 'en qué gasté este mes' },
    { label: 'Resumen del mes', utterance: 'resumen del mes' },
  ],
  'top-merchants': [
    { label: '¿Y el mes pasado?', utterance: 'y el mes pasado' },
    { label: '¿En qué categorías?', utterance: 'en qué gasté este mes' },
  ],
  'upcoming-payments': [
    { label: 'Mis suscripciones', utterance: 'qué suscripciones tengo' },
    { label: '¿Cuánto debo?', utterance: 'cuánto debo' },
  ],
  runway: [
    { label: '¿En qué se va?', utterance: 'en qué gasté este mes' },
    { label: 'Pagos próximos', utterance: 'qué pagos se vienen' },
  ],
  'compare-month': [
    { label: '¿En qué subió?', utterance: 'en qué gasté este mes' },
    { label: 'Top comercios', utterance: 'dónde gasté más este mes' },
  ],
  'biggest-charge': [
    { label: 'Top comercios', utterance: 'dónde gasté más este mes' },
    { label: '¿Y el mes pasado?', utterance: 'y el mes pasado' },
  ],
  subscriptions: [
    { label: 'Pagos próximos', utterance: 'qué pagos se vienen' },
    { label: 'Gasto recurrente vs total', utterance: 'en qué gasté este mes' },
  ],
  'savings-progress': [
    { label: '¿Cuánto me dura?', utterance: 'cuánto me dura el dinero' },
    { label: 'Resumen del mes', utterance: 'resumen del mes' },
  ],
  'debt-overview': [
    { label: 'Pagos próximos', utterance: 'qué pagos se vienen' },
    { label: 'Mi saldo', utterance: 'cuál es mi saldo total' },
  ],
  'account-detail': [
    { label: 'Mi saldo total', utterance: 'cuál es mi saldo total' },
    { label: '¿En qué gasté?', utterance: 'en qué gasté este mes' },
  ],
  'insights-active': [
    { label: 'Resumen del mes', utterance: 'resumen del mes' },
    { label: '¿Cómo voy con presupuestos?', utterance: 'cómo van mis presupuestos' },
  ],
  'search-transactions': [
    { label: '¿Y el mes pasado?', utterance: 'y el mes pasado' },
    { label: 'Mi saldo', utterance: 'cuál es mi saldo total' },
  ],
  'monthly-summary': [
    { label: '¿En qué se fue?', utterance: 'en qué gasté este mes' },
    { label: 'Presupuestos', utterance: 'cómo van mis presupuestos' },
    { label: '¿Qué me recomendás?', utterance: 'qué me recomiendas' },
  ],
  'dormant-money': [
    { label: 'Mi saldo total', utterance: 'cuál es mi saldo total' },
    { label: 'Mis cuentas', utterance: 'cuál es mi saldo total' },
  ],
}

export function buildFollowUps(intent: IntentId, slots: Slots): FollowUpChip[] {
  const base = STATIC[intent] ?? []

  // spend-by-category con categoría: ofrecer el comparativo y el detalle de
  // esa categoría manteniendo el contexto.
  if (intent === 'spend-by-category' && slots.category) {
    return [
      { label: '¿Y el mes pasado?', utterance: 'y el mes pasado' },
      { label: `Top comercios`, utterance: 'dónde gasté más este mes' },
      { label: `Presupuesto de ${slots.category.name}`, utterance: `presupuesto de ${slots.category.name}` },
    ]
  }

  return base.slice(0, 3)
}
