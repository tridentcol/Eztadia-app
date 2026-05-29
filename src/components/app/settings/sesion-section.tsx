import { UserButton } from '@clerk/nextjs'

import type { User } from '@/lib/db/schema'

type Props = {
  user: User
  baseCurrency: string | null
  locale: string | null
  timezone: string | null
}

/**
 * Vista de sesión y cuenta. Lectura solo (perfil financiero edita los
 * defaults). Aquí el usuario ve quién es, qué Clerk reconoce, y puede entrar
 * al UserButton para sign-out o gestión avanzada.
 */
export function SesionSection({ user, baseCurrency, locale, timezone }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="border-border-default bg-surface flex items-center gap-4 rounded-[12px] border p-4">
        <UserButton appearance={{ elements: { avatarBox: 'size-10' } }} />
        <div className="flex min-w-0 flex-col">
          <span className="text-text truncate text-sm font-semibold">
            {user.name ?? user.email}
          </span>
          <span className="text-text-tertiary truncate text-[12px]">
            {user.email}
          </span>
        </div>
      </div>

      <div className="border-border-default bg-surface flex flex-col divide-y divide-[color:var(--border-default)] rounded-[12px] border">
        <Row label="Moneda base" value={baseCurrency ?? '—'} mono />
        <Row label="Locale" value={locale ?? '—'} mono />
        <Row label="Zona horaria" value={timezone ?? '—'} mono />
      </div>

      <p className="text-text-tertiary text-[12px]">
        Para gestionar tu sesión, contraseña o dispositivos vinculados, usa el
        botón de usuario arriba.
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-text-secondary text-sm">{label}</span>
      <span
        className={`text-text truncate text-right text-sm${mono ? ' tabular' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}
