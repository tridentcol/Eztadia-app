'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { runInsightsNow } from '@/app/(app)/mi-historia/insights/actions'
import { icons } from '@/lib/design/icons'

/**
 * Disparo manual del pipeline de insights para el usuario actual. Útil
 * mientras no hay datos suficientes para que el cron tenga material, o para
 * verificar las lecturas tras un import/cambio importante.
 */
export function RunInsightsButton() {
  const router = useRouter()
  const [running, startTransition] = useTransition()
  const Spark = icons.sparkles

  function onClick() {
    startTransition(async () => {
      const res = await runInsightsNow()
      if (!res.ok) {
        toast.error(res.error.message)
        return
      }
      const { generated, skipped } = res.data
      if (generated === 0 && skipped === 0) {
        toast.message('Sin lecturas nuevas. Vuelve cuando haya más historial.')
      } else if (generated === 0) {
        toast.message(`Ya estabas al día — ${skipped} señales repetidas.`)
      } else {
        toast.success(`${generated} lecturas nuevas.`)
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
        {running ? 'Analizando…' : 'Analizar ahora'}
      </span>
    </Button>
  )
}
