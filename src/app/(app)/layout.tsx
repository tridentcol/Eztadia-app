import { Suspense } from 'react'
import { cookies } from 'next/headers'

import { requireCurrentUser } from '@/lib/auth'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app/app-sidebar'
import { MobileNav } from '@/components/app/mobile-nav'
import { Topbar } from '@/components/app/topbar'
import { CommandPalette } from '@/components/app/command-palette'
import { NewAccountDialog } from '@/components/app/new-account-dialog'
import { NewDebtDialog } from '@/components/app/new-debt-dialog'
import { CopilotDialog } from '@/components/app/copilot-dialog'
import { DialogsBundle } from '@/components/app/dialogs-bundle'
import { countUnreadAlerts } from '@/lib/db/queries/alerts'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await requireCurrentUser()

  const [unreadAlerts, cookieStore] = await Promise.all([
    countUnreadAlerts(user.id),
    cookies(),
  ])
  const sidebarDefault = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
    <SidebarProvider defaultOpen={sidebarDefault}>
      <AppSidebar />
      <SidebarInset>
        <Topbar unreadAlerts={unreadAlerts} />
        <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-[88px] sm:px-6 md:pb-10 lg:px-8 lg:py-10">
          {children}
        </main>
      </SidebarInset>
      <MobileNav />
      <CommandPalette />
      <NewAccountDialog />
      <NewDebtDialog />
      <CopilotDialog />
      <Suspense fallback={null}>
        <DialogsBundle />
      </Suspense>
    </SidebarProvider>
  )
}
