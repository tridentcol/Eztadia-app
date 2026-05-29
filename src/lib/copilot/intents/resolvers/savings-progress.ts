import 'server-only'

import { getSavingsHeroData } from '@/lib/db/queries/savings'
import type { AnswerBlock } from '../../render/answer-ast'
import type { IntentResolver } from '../types'
import { money } from '../helpers'

export const resolveSavingsProgress: IntentResolver = async (_slots, ctx) => {
  const hero = await getSavingsHeroData(ctx.userId)

  if (hero.periodsCount === 0) {
    return {
      intro: 'Aún no tienes un plan de ahorro activo.',
      blocks: [
        {
          type: 'text',
          body: 'Configura tu meta desde Mi plan → Ahorro y la voy siguiendo período a período.',
        },
      ],
    }
  }

  const blocks: AnswerBlock[] = [
    {
      type: 'amount',
      label: 'Ahorro acumulado',
      value: money(hero.totalAchieved, ctx.baseCurrency),
      currency: ctx.baseCurrency,
      tone: 'positive',
      note: `${hero.periodsCount} ${hero.periodsCount === 1 ? 'período' : 'períodos'}`,
    },
  ]

  const last = hero.lastPeriod
  if (last) {
    const target = Number.parseFloat(last.targetAmount)
    const achieved = Number.parseFloat(last.achievedAmount)
    const percent = target > 0 ? achieved / target : 0
    blocks.push({
      type: 'gauge',
      label: 'Período actual',
      spent: money(achieved, ctx.baseCurrency),
      limit: money(target, ctx.baseCurrency),
      percent,
      status: percent >= 1 ? 'safe' : percent >= 0.6 ? 'warning' : 'exceeded',
    })
  }

  return { blocks }
}
