import type { ReactNode } from 'react'

import { SectionTabs, type SectionTab } from '@/components/app/section-tabs'

const TABS: SectionTab[] = [
  { label: 'Cuentas', href: '/mi-dinero/cuentas' },
  { label: 'Tarjetas', href: '/mi-dinero/tarjetas' },
  { label: 'Deudas', href: '/mi-dinero/deudas' },
  { label: 'Movimientos', href: '/mi-dinero/movimientos' },
]

export default function MiDineroLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <SectionTabs tabs={TABS} ariaLabel="Sub-secciones de Mi dinero" />
      {children}
    </div>
  )
}
