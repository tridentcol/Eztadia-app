import 'server-only'

import type { IntentId, IntentResolver } from './types'
import { resolveShowBalance } from './resolvers/show-balance'
import { resolveAccountDetail } from './resolvers/account-detail'
import { resolveSpendByCategory } from './resolvers/spend-by-category'
import { resolveTopMerchants } from './resolvers/top-merchants'
import { resolveBudgetStatus } from './resolvers/budget-status'
import { resolveUpcomingPayments } from './resolvers/upcoming-payments'
import { resolveRunway } from './resolvers/runway'
import { resolveCompareMonth } from './resolvers/compare-month'
import { resolveBiggestCharge } from './resolvers/biggest-charge'
import { resolveSubscriptions } from './resolvers/subscriptions'
import { resolveSavingsProgress } from './resolvers/savings-progress'
import { resolveDebtOverview } from './resolvers/debt-overview'
import { resolveInsightsActive } from './resolvers/insights-active'
import { resolveSearchTransactions } from './resolvers/search-transactions'
import { resolveMonthlySummary } from './resolvers/monthly-summary'
import { resolveDormantMoney } from './resolvers/dormant-money'
import { resolveAdvice } from './resolvers/advice'
import { resolveHelp } from './resolvers/help'

/** Mapa IntentId → resolver server-side. Única fuente de despacho del engine. */
export const RESOLVERS: Record<IntentId, IntentResolver> = {
  'show-balance': resolveShowBalance,
  'account-detail': resolveAccountDetail,
  'spend-by-category': resolveSpendByCategory,
  'top-merchants': resolveTopMerchants,
  'budget-status': resolveBudgetStatus,
  'upcoming-payments': resolveUpcomingPayments,
  runway: resolveRunway,
  'compare-month': resolveCompareMonth,
  'biggest-charge': resolveBiggestCharge,
  subscriptions: resolveSubscriptions,
  'savings-progress': resolveSavingsProgress,
  'debt-overview': resolveDebtOverview,
  'insights-active': resolveInsightsActive,
  'search-transactions': resolveSearchTransactions,
  'monthly-summary': resolveMonthlySummary,
  'dormant-money': resolveDormantMoney,
  advice: resolveAdvice,
  help: resolveHelp,
}
