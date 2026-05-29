import type { ReactNode } from 'react'

import { SectionTabs, type SectionTab } from '@/components/app/section-tabs'

const TABS: SectionTab[] = [
  { label: 'Insights', href: '/mi-historia/insights' },
  { label: 'Informes', href: '/mi-historia/informes' },
]

export default function MiHistoriaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-10 lg:gap-12">
      <SectionTabs tabs={TABS} ariaLabel="Sub-secciones de Mi historia" />
      {children}
    </div>
  )
}
