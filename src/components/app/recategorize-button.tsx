'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { bulkRecategorize } from '@/app/(app)/transacciones/actions'
import { icons } from '@/lib/design/icons'

type Props = {
  pending: number
}

/**
 * Botón visible cuando hay transacciones sin categoría. Llama a la IA en
 * batch (kNN + LLM) y refresca la tabla. Si las keys no están configuradas,
 * el server action devuelve processed=0 — mostramos un toast informativo.
 */
export function RecategorizeButton({ pending }: Props) {
  const router = useRouter()
  const [running, startTransition] = useTransition()

  if (pending === 0) return null
  const Spark = icons.sparkles

  function onClick() {
    startTransition(async () => {
      const res = await bulkRecategorize()
      if (!res.ok) {
        toast.error(res.error.message)
        return
      }
      const { processed, categorized } = res.data
      if (processed === 0) {
        toast.message('No hay transacciones sin categoría.')
      } else if (categorized === 0) {
        toast.message(
          'Sin sugerencias confiables — configura las claves de IA o categoriza algunas manualmente para entrenar el modelo.',
        )
      } else {
        toast.success(`${categorized} de ${processed} categorizadas.`)
      }
      router.refresh()
    })
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={running}>
      <Spark
        strokeWidth={1.5}
        className="size-3.5"
        style={{ color: 'var(--accent-ai)' }}
      />
      <span className="ml-1.5">
        {running ? 'Categorizando…' : `Categorizar ${pending} con IA`}
      </span>
    </Button>
  )
}
