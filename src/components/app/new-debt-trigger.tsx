'use client'

import { Button } from '@/components/ui/button'
import { icons } from '@/lib/design/icons'
import { useDialogStore } from './dialog-store'

type Props = {
  variant?: 'primary' | 'outline' | 'ghost'
  label?: string
}

export function NewDebtTrigger({ variant = 'primary', label = 'Nueva deuda' }: Props) {
  const open = useDialogStore((s) => s.open)
  const Plus = icons.plus
  return (
    <Button size="md" variant={variant} onClick={() => open('new-debt')}>
      <Plus strokeWidth={1.5} className="size-4" />
      {label}
    </Button>
  )
}
