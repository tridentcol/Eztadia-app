'use client'

import { usePathname } from 'next/navigation'

type Props = {
  children: React.ReactNode
}

/**
 * Cross-fade muy sutil al cambiar de ruta dentro de (app)/*. Sin slide,
 * sin scale — solo opacity 0 → 1 en 140ms con la curva Noir. Suficiente
 * para acusar el cambio de pantalla sin sentirse coreográfico.
 *
 * El truco es `key={pathname}`: React desmonta el subtree anterior y
 * monta el nuevo. tw-animate-css aplica fade-in al elemento recién
 * montado. El @media (prefers-reduced-motion: reduce) global ya
 * neutraliza la duración para usuarios sensibles.
 *
 * No usamos View Transitions API a propósito — añadían lag perceptible
 * porque suspenden el render mientras toman snapshots (ver nota en
 * globals.css). Un fade CSS puro evita ese costo.
 */
export function PageTransition({ children }: Props) {
  const pathname = usePathname()
  return (
    <div
      key={pathname}
      className="animate-in fade-in-0 duration-150"
      style={{ animationTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
    >
      {children}
    </div>
  )
}
