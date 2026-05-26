'use client'

import { Button } from '@/components/ui/button'
import { icons } from '@/lib/design/icons'
import { useDialogStore } from './dialog-store'

export function NewTransactionTrigger({
  variant = 'primary',
  label = 'Nueva transacción',
}: {
  variant?: 'primary' | 'outline'
  label?: string
}) {
  const open = useDialogStore((s) => s.open)
  const Plus = icons.plus
  return (
    <Button variant={variant} onClick={() => open('new-transaction')}>
      <Plus strokeWidth={1.5} className="size-4" />
      {label}
    </Button>
  )
}
