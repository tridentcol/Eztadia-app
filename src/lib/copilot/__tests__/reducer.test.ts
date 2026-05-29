import { describe, it, expect } from 'vitest'

import {
  resolveTurn,
  mergeSlots,
  EMPTY_CONTEXT,
  type ConversationContext,
} from '../conversation/reducer'
import { tokenize } from '../nlu/tokenize'
import type { SlotKey, Slots } from '../intents/types'
import type { ClassifierResult } from '../nlu/intent-classifier'

function weak(intent: ClassifierResult['intent']): ClassifierResult {
  return { intent, confidence: 0.2, score: 0, decision: 'fallback', ranking: [] }
}
function strong(intent: ClassifierResult['intent']): ClassifierResult {
  return { intent, confidence: 0.9, score: 4, decision: 'execute', ranking: [] }
}

const PERIOD = { from: '2026-05-01', to: '2026-05-31', label: 'este mes', granularity: 'month' as const }

function present(slots: Slots): Set<SlotKey> {
  const s = new Set<SlotKey>()
  ;(['period', 'category', 'merchant', 'account', 'money', 'ordering', 'query'] as SlotKey[]).forEach(
    (k) => slots[k] && s.add(k),
  )
  return s
}

function run(utterance: string, slots: Slots, classification: ClassifierResult, context: ConversationContext) {
  return resolveTurn({
    tokens: tokenize(utterance),
    slots,
    presentSlots: present(slots),
    classification,
    context,
  })
}

describe('mergeSlots', () => {
  it('hereda query y merchant del turno previo', () => {
    const prev: Slots = { query: 'netflix', merchant: { slug: 'netflix', name: 'Netflix' } }
    const merged = mergeSlots(prev, { period: PERIOD })
    expect(merged.query).toBe('netflix')
    expect(merged.merchant?.name).toBe('Netflix')
    expect(merged.period).toEqual(PERIOD)
  })
})

describe('resolveTurn — redirección de dimensión', () => {
  const ctxSpend: ConversationContext = {
    lastIntent: 'spend-by-category',
    lastSlots: { category: { id: 'c1', name: 'Mercado' }, period: PERIOD },
    turnHistory: [],
  }

  it('"y comparado" → compare-month heredando categoría', () => {
    const r = run('y comparado', {}, weak('help'), ctxSpend)
    expect(r.intent).toBe('compare-month')
    expect(r.viaEllipsis).toBe(true)
    expect(r.slots.category?.id).toBe('c1')
  })

  it('"y por comercio" → top-merchants', () => {
    const r = run('y por comercio', {}, weak('help'), ctxSpend)
    expect(r.intent).toBe('top-merchants')
  })

  it('"y mi débito" tras saldo → account-detail', () => {
    const ctxBalance: ConversationContext = {
      lastIntent: 'show-balance',
      lastSlots: {},
      turnHistory: [],
    }
    const slots: Slots = { account: { id: 'a1', name: 'Débito', type: 'checking' } }
    const r = run('y mi debito', slots, weak('help'), ctxBalance)
    expect(r.intent).toBe('account-detail')
  })

  it('"y la semana pasada" sin redirección → reusa el intent previo', () => {
    const slots: Slots = { period: PERIOD }
    const r = run('y la semana pasada', slots, weak('help'), ctxSpend)
    expect(r.intent).toBe('spend-by-category')
    expect(r.viaEllipsis).toBe(true)
  })
})

describe('resolveTurn — sin contexto', () => {
  it('un intent fuerte fresco no se marca como elipsis', () => {
    const r = run('cual es mi saldo', {}, strong('show-balance'), EMPTY_CONTEXT)
    expect(r.intent).toBe('show-balance')
    expect(r.viaEllipsis).toBe(false)
  })
})
