'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { icons, type IconName } from '@/lib/design/icons'
import { BrandMark } from '@/components/brand/brand-mark'
import { BrandWordmark } from '@/components/brand/brand-wordmark'

// Hover y active del sidebar tintados con el morado de marca — detalle sutil.
// Override del hover/active default del shadcn (que es bg-sidebar-accent neutro).
const navItemClass =
  'hover:!bg-[var(--nav-hover-bg)] data-[active=true]:!bg-[var(--nav-active-bg)] data-[active=true]:!text-[var(--nav-active-fg)] data-[active=true]:!font-medium'

type SubItem = { label: string; href: string }
type NavItem = {
  label: string
  href: string
  icon: IconName
  // Si está presente, el item top-level se expande mostrando subitems cuando
  // el pathname está dentro de su sección. El click en el item top-level lleva
  // al primer subitem (el redirect del `page.tsx` index ya lo resuelve).
  subItems?: SubItem[]
}

const TOP_ITEMS: NavItem[] = [
  { label: 'Hoy', href: '/dashboard', icon: 'home' },
  {
    label: 'Mi dinero',
    href: '/mi-dinero',
    icon: 'wallet',
    subItems: [
      { label: 'Cuentas', href: '/mi-dinero/cuentas' },
      { label: 'Deudas', href: '/mi-dinero/deudas' },
      { label: 'Movimientos', href: '/mi-dinero/movimientos' },
    ],
  },
  {
    label: 'Mi plan',
    href: '/mi-plan',
    icon: 'target',
    subItems: [
      { label: 'Presupuestos', href: '/mi-plan/presupuestos' },
      { label: 'Metas', href: '/mi-plan/metas' },
      { label: 'Ahorro', href: '/mi-plan/ahorro' },
      { label: 'Cash flow', href: '/mi-plan/cash-flow' },
      { label: 'Recurrentes', href: '/mi-plan/recurrentes' },
    ],
  },
  {
    label: 'Mi historia',
    href: '/mi-historia',
    icon: 'book-open',
    subItems: [
      { label: 'Insights', href: '/mi-historia/insights' },
      { label: 'Informes', href: '/mi-historia/informes' },
    ],
  },
]

const FOOTER_ITEMS: NavItem[] = [
  { label: 'Ajustes', href: '/ajustes', icon: 'settings' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { isMobile } = useSidebar()

  // En mobile usamos MobileNav (bottom-nav fijo + sheet "Más").
  // El sidebar es exclusivo de >=md.
  if (isMobile) return null

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          aria-label="finanzia"
          className="flex h-10 items-center gap-2 px-2 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:self-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <BrandMark size={24} />
          <BrandWordmark
            size={18}
            className="text-text truncate group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOP_ITEMS.map((item) => {
                const Icon = icons[item.icon]
                const active = isActive(pathname, item.href)
                const expanded = active && item.subItems !== undefined
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={navItemClass}
                    >
                      <Link href={item.href} prefetch>
                        <Icon strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {expanded && item.subItems && (
                      <SidebarMenuSub>
                        {item.subItems.map((sub) => {
                          const subActive =
                            pathname === sub.href ||
                            pathname.startsWith(`${sub.href}/`)
                          return (
                            <SidebarMenuSubItem key={sub.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={subActive}
                              >
                                <Link href={sub.href} prefetch>
                                  <span>{sub.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {FOOTER_ITEMS.map((item) => {
            const Icon = icons[item.icon]
            const active = isActive(pathname, item.href)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={navItemClass}
                >
                  <Link href={item.href} prefetch>
                    <Icon strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <UserButton
                appearance={{ elements: { avatarBox: 'size-7' } }}
              />
              <span className="text-text-secondary truncate text-[12px] group-data-[collapsible=icon]:hidden">
                Tu cuenta
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
