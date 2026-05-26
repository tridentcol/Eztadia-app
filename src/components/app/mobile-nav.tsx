'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { icons, type IconName } from '@/lib/design/icons'
import { cn } from '@/lib/utils'

type MobileNavItem = {
  label: string
  href: string
  icon: IconName
}

const ITEMS: MobileNavItem[] = [
  { label: 'Resumen', href: '/dashboard', icon: 'home' },
  { label: 'Cuentas', href: '/cuentas', icon: 'wallet' },
  { label: 'Bitácora', href: '/transacciones', icon: 'list' },
  { label: 'Insights', href: '/insights', icon: 'sparkles' },
  { label: 'Más', href: '/ajustes', icon: 'settings' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Bottom nav para mobile (<lg). 5 items primarios; "Más" abre Ajustes
 * (que conecta a integraciones y futuras subsections). El sidebar 240px
 * queda oculto.
 *
 * Pos fija en el bottom; el main content tiene padding-bottom para no
 * solaparse.
 */
export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="border-border-default bg-surface/95 fixed inset-x-0 bottom-0 z-40 flex h-[58px] items-stretch border-t backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {ITEMS.map((item) => {
        const Icon = icons[item.icon]
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors',
              active ? 'text-text' : 'text-text-tertiary',
            )}
          >
            <Icon
              strokeWidth={1.5}
              className={cn('size-[18px]', active && 'text-text')}
            />
            <span className="text-[10px] font-medium tracking-tight">
              {item.label}
            </span>
            {active && (
              <span
                aria-hidden
                className="absolute top-0 h-0.5 w-7 rounded-full"
                style={{ background: 'var(--accent-ai)' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
