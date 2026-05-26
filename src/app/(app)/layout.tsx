import { ViewTransition } from 'react'

import { requireCurrentUser } from '@/lib/auth'
import { Sidebar } from '@/components/app/sidebar'
import { MobileNav } from '@/components/app/mobile-nav'
import { Topbar } from '@/components/app/topbar'
import { CommandPalette } from '@/components/app/command-palette'
import { NewAccountDialog } from '@/components/app/new-account-dialog'
import { NewTransactionDialog } from '@/components/app/new-transaction-dialog'
import { NewCategoryDialog } from '@/components/app/new-category-dialog'
import { EditCategoryDialog } from '@/components/app/edit-category-dialog'
import { NewBudgetDialog } from '@/components/app/new-budget-dialog'
import { CopilotDialog } from '@/components/app/copilot-dialog'
import {
  listAvailableCategories,
  listUserAccountsBasic,
} from '@/lib/db/queries/transactions'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await requireCurrentUser()

  const [accountsForForm, categoriesForForm] = await Promise.all([
    listUserAccountsBasic(user.id),
    listAvailableCategories(user.id),
  ])

  return (
    <div className="bg-background text-text min-h-svh">
      <Sidebar />
      <div className="lg:pl-[240px]">
        <Topbar />
        <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-[80px] sm:px-6 lg:px-8 lg:py-10 lg:pb-10">
          <ViewTransition name="app-content">{children}</ViewTransition>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <NewAccountDialog />
      <NewTransactionDialog
        accounts={accountsForForm}
        categories={categoriesForForm}
      />
      <NewCategoryDialog categories={categoriesForForm} />
      <EditCategoryDialog categories={categoriesForForm} />
      <NewBudgetDialog categories={categoriesForForm} />
      <CopilotDialog />
    </div>
  )
}
