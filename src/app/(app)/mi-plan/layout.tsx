import type { ReactNode } from 'react'

import { SectionTabs, type SectionTab } from '@/components/app/section-tabs'

const TABS: SectionTab[] = [
  { label: 'Presupuestos', href: '/mi-plan/presupuestos' },
  { label: 'Metas', href: '/mi-plan/metas' },
  { label: 'Ahorro', href: '/mi-plan/ahorro' },
  { label: 'Cash flow', href: '/mi-plan/cash-flow' },
  { label: 'Recurrentes', href: '/mi-plan/recurrentes' },
]

export default function MiPlanLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-10 lg:gap-12">
      <SectionTabs tabs={TABS} ariaLabel="Sub-secciones de Mi plan" />
      {children}
    </div>
  )
}
