'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { icons } from '@/lib/design/icons'

type Props = {
  initialDay: string | null
}

/**
 * Input `type="date"` compacto en el header de movimientos. Cuando cambia el
 * valor, navega a `?day=YYYY-MM-DD` y la página activa la vista diaria. Si
 * el usuario lo limpia, navega de vuelta a la bitácora completa.
 */
export function DayPickerNav({ initialDay }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(initialDay ?? '')
  const Calendar = icons.calendar

  function handleChange(next: string) {
    setValue(next)
    if (!next) {
      router.push('/mi-dinero/movimientos')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return
    router.push(`/mi-dinero/movimientos?day=${next}`)
  }

  return (
    <label className="border-border-default bg-surface text-text-secondary hover:bg-surface-hover hover:text-text relative inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border pl-2.5 pr-2 text-sm transition-colors">
      <Calendar strokeWidth={1.5} className="size-[14px]" />
      <span className="hidden sm:inline">
        {initialDay ? 'Ver otro día' : 'Día'}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Seleccionar día"
      />
    </label>
  )
}
