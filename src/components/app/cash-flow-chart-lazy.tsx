'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * Carga diferida del chart @visx: su JS (visx) sale del bundle de la ruta y se
 * trae en el cliente al montar, con un skeleton Noir. ssr:false porque el chart
 * mide en el cliente (ParentSize) y no aporta nada en el render del servidor.
 */
export const CashFlowChart = dynamic(
  () => import('./cash-flow-chart').then((m) => m.CashFlowChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-[12px]" /> },
)
