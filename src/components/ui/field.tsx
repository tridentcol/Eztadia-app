import * as React from 'react'

import { cn } from '@/lib/utils'
import { Label } from './label'

type FieldProps = {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

/**
 * Combinador label + control + hint/error. Mantiene la jerarquía vertical
 * uniforme en todos los formularios.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-negative text-xs">{error}</p>
      ) : hint ? (
        <p className="text-text-tertiary text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
