'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

/** Carga diferida del forecast de ahorro (@visx). Ver cash-flow-chart-lazy. */
export const SavingsForecastChart = dynamic(
  () => import('./savings-forecast-chart').then((m) => m.SavingsForecastChart),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full rounded-[12px]" /> },
)
