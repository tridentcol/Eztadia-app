import { describe, it, expect } from 'vitest'

import { insightToAdvice } from '../advice/to-advice'
import type { DetectedInsight } from '@/lib/ai/insights/types'

/** Fixture mínimo: insightToAdvice solo lee kind/severity/title/body/action. */
function insight(partial: Partial<DetectedInsight>): DetectedInsight {
  return {
    kind: 'anomaly',
    severity: 'notice',
    title: 'título',
    body: 'cuerpo',
    action: null,
    ...partial,
  } as unknown as DetectedInsight
}

describe('insightToAdvice', () => {
  it('warning → tono warning y acción navigate desde view-transactions', () => {
    const { block, action } = insightToAdvice(
      insight({
        severity: 'warning',
        action: { type: 'view-transactions', label: 'Ver', params: {} },
      } as Partial<DetectedInsight>),
    )
    expect(block.type).toBe('advice')
    expect(block.tone).toBe('warning')
    expect(action).toEqual({ kind: 'navigate', label: 'Ver', href: '/mi-dinero/movimientos' })
  })

  it('achievement → tono positivo, sin acción si action es null', () => {
    const { block, action } = insightToAdvice(insight({ kind: 'achievement', severity: 'info' }))
    expect(block.tone).toBe('positive')
    expect(action).toBeUndefined()
  })

  it('navigate con href propio se respeta', () => {
    const { action } = insightToAdvice(
      insight({
        action: { type: 'navigate', label: 'Ir', params: { href: '/mi-plan/ahorro' } },
      } as Partial<DetectedInsight>),
    )
    expect(action).toEqual({ kind: 'navigate', label: 'Ir', href: '/mi-plan/ahorro' })
  })

  it('notice neutro y view-recurring → recurrentes', () => {
    const { block, action } = insightToAdvice(
      insight({
        severity: 'notice',
        action: { type: 'view-recurring', label: 'Crear regla', params: {} },
      } as Partial<DetectedInsight>),
    )
    expect(block.tone).toBe('neutral')
    expect(action?.kind).toBe('navigate')
    expect(action && 'href' in action ? action.href : '').toBe('/mi-plan/recurrentes')
  })
})
