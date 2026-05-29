import type { IntentMeta } from './types'

/**
 * Catálogo de metadata clasificable de los intents. PURO — sin DB, sin
 * server-only. Es lo único que necesitan el classifier y el corpus de tests.
 *
 * Keywords ya normalizadas (sin acentos): el classifier las compara contra el
 * texto normalizado. Patterns corren sobre el texto normalizado (contracciones
 * expandidas: "del" → "de el").
 */
export const INTENT_CATALOG: IntentMeta[] = [
  {
    id: 'show-balance',
    keywords: ['saldo', 'cuanto tengo', 'balance', 'plata', 'dinero', 'cuanta plata'],
    patterns: [/\b(saldo total|cuanto tengo|mi saldo|balance total|cuanta plata tengo)\b/],
    slotsExpected: [],
  },
  {
    id: 'account-detail',
    keywords: ['saldo de', 'cuanto tengo en', 'cuanto hay en'],
    patterns: [/\b(saldo de (mi|la)|cuanto (tengo|hay) en (mi|la))\b/],
    slotsExpected: ['account'],
    slotsRequired: ['account'],
  },
  {
    id: 'spend-by-category',
    keywords: ['gaste', 'gasto en', 'gastos de', 'en que se va', 'cuanto gaste'],
    patterns: [/\b(cuanto gast|gast[eo]s? (en|de)|en que se (va|me va))\b/],
    slotsExpected: ['category', 'period'],
  },
  {
    id: 'top-merchants',
    keywords: ['donde gaste mas', 'top tiendas', 'comercios', 'tiendas', 'en que comercio'],
    patterns: [/\b(donde gast|top (tiendas|comercios)|que comercio|en que (tienda|comercio))\b/],
    slotsExpected: ['period'],
  },
  {
    id: 'budget-status',
    keywords: ['presupuesto', 'presupuestos', 'tope', 'como voy con', 'limite de gasto'],
    patterns: [/\b(presupuesto|como voy con (mi|el|los)|tope de gasto|limite de gasto)\b/],
    slotsExpected: ['category'],
  },
  {
    id: 'upcoming-payments',
    keywords: ['proximos pagos', 'que se viene', 'que pagos', 'que tengo que pagar', 'vencimientos'],
    patterns: [/\b(proximos? pagos?|que se viene|que (pagos?|tengo que pagar)|vencimiento)\b/],
    slotsExpected: ['period'],
  },
  {
    id: 'runway',
    keywords: ['cuanto me dura', 'runway', 'hasta cuando me alcanza', 'cuanto me alcanza'],
    patterns: [/\b(cuanto me (dura|alcanza)|runway|hasta cuando (me alcanza|aguanto))\b/],
    slotsExpected: [],
  },
  {
    id: 'compare-month',
    keywords: ['comparar', 'vs mes pasado', 'comparado con', 'gaste mas o menos', 'diferencia con'],
    patterns: [/\b(compar(ar|a|o)|vs (el )?mes pasado|gaste (mas|menos) que|diferencia con)\b/],
    slotsExpected: ['period'],
  },
  {
    id: 'biggest-charge',
    keywords: ['el mas caro', 'gasto mas grande', 'mayor gasto', 'compra mas grande', 'el mas costoso'],
    patterns: [/\b(el (gasto |cargo )?mas (caro|grande|costoso)|mayor gasto|compra mas grande)\b/],
    slotsExpected: ['ordering', 'period'],
  },
  {
    id: 'subscriptions',
    keywords: ['suscripciones', 'suscripcion', 'que pago recurrente', 'pagos recurrentes', 'mensualidades'],
    patterns: [/\b(suscripcion|que pago (cada mes|recurrente|fijo)|pagos? recurrentes?|mensualidad)\b/],
    slotsExpected: [],
  },
  {
    id: 'savings-progress',
    keywords: ['ahorro', 'meta de ahorro', 'como voy con la meta', 'cuanto he ahorrado', 'ahorre'],
    patterns: [/\b(ahorr[oe]|meta de ahorro|como voy con (la meta|el ahorro)|cuanto he ahorrado)\b/],
    slotsExpected: [],
  },
  {
    id: 'debt-overview',
    keywords: ['deudas', 'cuanto debo', 'prestamos', 'deuda', 'cuanto debe'],
    patterns: [/\b(deuda|cuanto debo|prestamo|mis prestamos)\b/],
    slotsExpected: [],
  },
  {
    id: 'insights-active',
    keywords: ['que detectaste', 'anomalias', 'lecturas', 'insights', 'que encontraste', 'que detecto'],
    patterns: [/\b(que (detectaste|encontraste|detecto)|anomal|lectura|insight|que has visto)\b/],
    slotsExpected: [],
  },
  {
    id: 'search-transactions',
    keywords: ['busca', 'encuentra', 'transacciones de', 'pagos a', 'movimientos de', 'buscar'],
    patterns: [/\b(busc\w*|encuentr\w*|pagos? a|transacci(o|on)es? de|movimientos? de)\b/],
    slotsExpected: ['query', 'merchant'],
  },
  {
    id: 'monthly-summary',
    keywords: ['resumen', 'panorama', 'recap', 'como voy este mes', 'como cerro el mes'],
    patterns: [/\b(resumen|panorama|recap|como (voy|cerro|cierra) (este|el) mes)\b/],
    slotsExpected: ['period'],
  },
  {
    id: 'dormant-money',
    keywords: ['cuentas sin movimiento', 'plata quieta', 'dinero dormido', 'cuentas dormidas', 'sin usar'],
    patterns: [/\b(cuentas? (sin movimiento|dormidas?|sin usar)|plata quieta|dinero (dormido|parado))\b/],
    slotsExpected: [],
  },
  {
    id: 'advice',
    keywords: ['que me recomiendas', 'donde puedo ahorrar', 'consejos', 'como mejoro', 'en que ahorro', 'tips', 'recomendacion'],
    patterns: [/\b(recomien|recomend|donde (puedo )?ahorr|consejo|como (puedo )?mejor|en que (puedo )?ahorr|dame (un )?tip)\b/],
    slotsExpected: [],
  },
  {
    id: 'help',
    keywords: ['ayuda', 'que sabes', 'que puedes', 'comandos', 'help', 'que puedo preguntar'],
    patterns: [/\b(ayuda|que (sabes|puedes|puedo preguntar)|comandos|help)\b/],
    slotsExpected: [],
  },
]
