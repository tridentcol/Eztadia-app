'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

/** Carga diferida del bar chart de ahorro (@visx). Ver cash-flow-chart-lazy. */
export const SavingsBarChart = dynamic(
  () => import('./savings-bar-chart').then((m) => m.SavingsBarChart),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full rounded-[12px]" /> },
)
