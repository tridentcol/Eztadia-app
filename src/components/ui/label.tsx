import * as React from 'react'
import { Label as RadixLabel } from 'radix-ui'

import { cn } from '@/lib/utils'

type LabelProps = React.ComponentProps<typeof RadixLabel.Root>

function Label({ className, ...props }: LabelProps) {
  return (
    <RadixLabel.Root
      data-slot="label"
      className={cn(
        'text-text-secondary text-[13px] font-medium leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
