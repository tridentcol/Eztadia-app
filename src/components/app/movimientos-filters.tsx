'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { icons } from '@/lib/design/icons'
import { CategoryCombobox } from './category-combobox'

type CategoryOption = {
  id: string
  name: string
  kind: 'income' | 'expense' | 'transfer'
}

type Props = {
  categories: CategoryOption[]
}

/**
 * Botón "Filtros" en el header de /mi-dinero/movimientos que abre un
 * dialog con: categoría, rango de fechas, rango de montos. Al aplicar
 * actualiza los searchParams — la página de movimientos los lee y filtra.
 */
export function MovimientosFilters({ categories }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '')
  const [from, setFrom] = useState(searchParams.get('from') ?? '')
  const [to, setTo] = useState(searchParams.get('to') ?? '')
  const [minAmount, setMinAmount] = useState(searchParams.get('minAmount') ?? '')
  const [maxAmount, setMaxAmount] = useState(searchParams.get('maxAmount') ?? '')

  const Filter = icons.filter
  const activeCount = [
    searchParams.get('categoryId'),
    searchParams.get('from'),
    searchParams.get('to'),
    searchParams.get('minAmount'),
    searchParams.get('maxAmount'),
    searchParams.get('q'),
  ].filter(Boolean).length

  function apply() {
    const params = new URLSearchParams(searchParams.toString())
    // Mantengo q (búsqueda libre de Cmd+K) si estaba.
    setOrDelete(params, 'categoryId', categoryId)
    setOrDelete(params, 'from', from)
    setOrDelete(params, 'to', to)
    setOrDelete(params, 'minAmount', minAmount)
    setOrDelete(params, 'maxAmount', maxAmount)
    params.delete('day')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setOpen(false)
  }

  function clear() {
    setCategoryId('')
    setFrom('')
    setTo('')
    setMinAmount('')
    setMaxAmount('')
    router.push(pathname)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Filter strokeWidth={1.5} className="size-[14px]" />
        Filtros
        {activeCount > 0 && (
          <span
            className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
            style={{
              background: 'var(--purple-base)',
              color: '#FFFFFF',
            }}
          >
            {activeCount}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Filtrar movimientos</DialogTitle>
            <DialogDescription>
              Combiná los criterios para acotar la bitácora.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field label="Categoría">
              <CategoryCombobox
                options={categories.map((c) => ({ id: c.id, name: c.name }))}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Todas las categorías"
                emptyLabel="Todas las categorías"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="tabular"
                />
              </Field>
              <Field label="Hasta">
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="tabular"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Monto mínimo">
                <Input
                  inputMode="decimal"
                  value={minAmount}
                  onChange={(e) =>
                    setMinAmount(e.target.value.replace(/[^\d.]/g, ''))
                  }
                  placeholder="0"
                  className="tabular"
                />
              </Field>
              <Field label="Monto máximo">
                <Input
                  inputMode="decimal"
                  value={maxAmount}
                  onChange={(e) =>
                    setMaxAmount(e.target.value.replace(/[^\d.]/g, ''))
                  }
                  placeholder="∞"
                  className="tabular"
                />
              </Field>
            </div>
          </div>

          <DialogFooter className="sm:gap-2">
            <Button type="button" variant="ghost" onClick={clear}>
              Limpiar todo
            </Button>
            <Button type="button" onClick={apply}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value && value.trim()) {
    params.set(key, value.trim())
  } else {
    params.delete(key)
  }
}
