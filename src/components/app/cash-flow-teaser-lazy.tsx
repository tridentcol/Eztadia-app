'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

/** Carga diferida del teaser de cash flow (@visx). Ver cash-flow-chart-lazy. */
export const CashFlowTeaser = dynamic(
  () => import('./cash-flow-teaser').then((m) => m.CashFlowTeaser),
  { ssr: false, loading: () => <Skeleton className="h-44 w-full rounded-[12px]" /> },
)
