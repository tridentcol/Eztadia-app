'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  removeIntegration,
  saveIntegration,
} from '@/app/(app)/ajustes/integraciones/actions'
import type { Provider } from '@/lib/integrations/store'
import { icons } from '@/lib/design/icons'

type IntegrationSummary = {
  provider: Provider
  status: 'active' | 'invalid' | 'disabled'
  scopes: string[]
  lastValidatedAt: Date | null
  createdAt: Date
}

type Props = {
  provider: Provider
  name: string
  description: string
  signupUrl: string
  availableScopes: string[]
  defaultScopes: string[]
  integration: IntegrationSummary | null
}

const scopeLabels: Record<string, string> = {
  embed: 'Embeddings',
  chat: 'Generación / Chat',
}

export function IntegrationCard({
  provider,
  name,
  description,
  signupUrl,
  availableScopes,
  defaultScopes,
  integration,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [removing, startRemoving] = useTransition()
  const Spark = icons.sparkles

  function onRemove() {
    if (!confirm(`Quitar la integración con ${name}?`)) return
    startRemoving(async () => {
      const res = await removeIntegration(provider)
      if (!res.ok) {
        toast.error(res.error.message)
        return
      }
      toast.success('Integración eliminada.')
      router.refresh()
    })
  }

  const configured = !!integration
  const statusLabel = configured ? 'Configurada' : 'No configurada'
  const statusDot = configured ? 'bg-positive' : 'bg-text-tertiary'

  return (
    <article className="border-border-default bg-surface flex flex-col gap-4 rounded-[12px] border p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Spark
              strokeWidth={1.5}
              className="size-4"
              style={{ color: 'var(--accent-ai)' }}
            />
            <h3 className="text-text text-base font-semibold">{name}</h3>
          </div>
          <p className="text-text-secondary max-w-prose text-[13px]">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${statusDot}`} aria-hidden />
          <span className="text-text-tertiary text-[11px] uppercase tracking-[0.08em]">
            {statusLabel}
          </span>
        </div>
      </header>

      {configured && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
          <dt className="text-text-tertiary">Scopes activos</dt>
          <dd className="text-text-secondary">
            {integration.scopes.length === 0
              ? '—'
              : integration.scopes.map((s) => scopeLabels[s] ?? s).join(' · ')}
          </dd>
          <dt className="text-text-tertiary">Conectado</dt>
          <dd className="text-text-secondary tabular">
            {integration.createdAt.toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </dd>
        </dl>
      )}

      <div className="flex items-center justify-between gap-2">
        <a
          href={signupUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-text-tertiary hover:text-text-secondary text-[12px] underline-offset-2 hover:underline"
        >
          Obtener una clave
        </a>
        <div className="flex items-center gap-2">
          {configured && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={removing}
            >
              {removing ? 'Quitando…' : 'Quitar'}
            </Button>
          )}
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            {configured ? 'Reemplazar key' : 'Conectar'}
          </Button>
        </div>
      </div>

      <ConnectDialog
        open={open}
        onOpenChange={setOpen}
        provider={provider}
        name={name}
        availableScopes={availableScopes}
        defaultScopes={configured ? integration.scopes : defaultScopes}
      />
    </article>
  )
}

function ConnectDialog({
  open,
  onOpenChange,
  provider,
  name,
  availableScopes,
  defaultScopes,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  provider: Provider
  name: string
  availableScopes: string[]
  defaultScopes: string[]
}) {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [scopes, setScopes] = useState<string[]>(defaultScopes)
  const [saving, startSaving] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  function reset() {
    setApiKey('')
    setScopes(defaultScopes)
    setServerError(null)
  }

  function toggleScope(scope: string) {
    setScopes((curr) =>
      curr.includes(scope) ? curr.filter((s) => s !== scope) : [...curr, scope],
    )
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim()) return
    setServerError(null)
    startSaving(async () => {
      const res = await saveIntegration({
        provider,
        apiKey: apiKey.trim(),
        scopes,
      })
      if (!res.ok) {
        setServerError(res.error.message)
        return
      }
      toast.success(`${name} conectado.`)
      reset()
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar {name}</DialogTitle>
          <DialogDescription>
            La clave se guarda cifrada en Supabase Vault. No la mostramos otra
            vez; si la pierdes, pégala de nuevo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="API key" htmlFor={`apikey-${provider}`}>
            <Input
              id={`apikey-${provider}`}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
              className="font-mono"
            />
          </Field>

          {availableScopes.length > 1 && (
            <Field label="Permitir usar para">
              <div className="flex flex-col gap-2">
                {availableScopes.map((s) => {
                  const checked = scopes.includes(s)
                  return (
                    <label
                      key={s}
                      className="border-border-default hover:bg-surface-hover/60 flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-sm"
                    >
                      <span className="text-text">{scopeLabels[s] ?? s}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleScope(s)}
                        className="size-4 accent-[color:var(--accent-ai)]"
                      />
                    </label>
                  )
                })}
              </div>
            </Field>
          )}

          {serverError && <p className="text-negative text-xs">{serverError}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !apiKey.trim() || scopes.length === 0}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
