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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { updateRecurringRule } from '@/app/(app)/mi-plan/recurrentes/actions'
import { CategoryCombobox } from './category-combobox'

type AccountOption = { id: string; name: string; currency: string }
type CategoryOption = {
  id: string
  name: string
  kind: 'income' | 'expense' | 'transfer'
}

type Rule = {
  id: string
  description: string
  accountId: string
  categoryId: string | null
  amount: string
  kind: 'income' | 'expense'
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  nextRun: string
  autoCreate: boolean
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: Rule | null
  accounts: AccountOption[]
  categories: CategoryOption[]
}

const FREQ_LABELS: Record<Rule['frequency'], string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
}

export function EditRecurringDialog({
  open,
  onOpenChange,
  rule,
  accounts,
  categories,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && rule && (
        <EditForm
          rule={rule}
          accounts={accounts}
          categories={categories}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  )
}

function EditForm({
  rule,
  accounts,
  categories,
  onDone,
}: {
  rule: Rule
  accounts: AccountOption[]
  categories: CategoryOption[]
  onDone: () => void
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [description, setDescription] = useState(rule.description)
  const [accountId, setAccountId] = useState(rule.accountId)
  const [categoryId, setCategoryId] = useState(rule.categoryId ?? '')
  const [amount, setAmount] = useState(rule.amount)
  const [kind, setKind] = useState<Rule['kind']>(rule.kind)
  const [frequency, setFrequency] = useState<Rule['frequency']>(rule.frequency)
  const [nextRun, setNextRun] = useState(rule.nextRun)
  const [autoCreate, setAutoCreate] = useState(rule.autoCreate)

  const eligibleCategories = categories.filter((c) => c.kind === kind)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    if (!description.trim()) {
      setServerError('Escribe una descripción.')
      return
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      setServerError('Monto inválido.')
      return
    }
    startTransition(async () => {
      const res = await updateRecurringRule({
        id: rule.id,
        description: description.trim(),
        accountId,
        categoryId:
          categoryId &&
          eligibleCategories.some((c) => c.id === categoryId)
            ? categoryId
            : null,
        amount,
        kind,
        frequency,
        nextRun,
        autoCreate,
      })
      if (!res.ok) {
        setServerError(res.error.message)
        toast.error(res.error.message)
        return
      }
      toast.success('Regla actualizada.')
      router.refresh()
      onDone()
    })
  }

  return (
    <DialogContent className="sm:max-w-[560px]">
      <DialogHeader>
        <DialogTitle>Editar regla recurrente</DialogTitle>
        <DialogDescription className="sr-only">
          Edita una regla recurrente existente.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit}
        className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
      >
        <Field label="Descripción">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Arriendo, Netflix, Salario…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={kind} onValueChange={(v) => setKind(v as Rule['kind'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Gasto</SelectItem>
                <SelectItem value="income">Ingreso</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Frecuencia">
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as Rule['frequency'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FREQ_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cuenta">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}{' '}
                    <span className="text-text-tertiary ml-1 text-[11px]">
                      {a.currency}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Categoría">
            <CategoryCombobox
              options={eligibleCategories.map((c) => ({
                id: c.id,
                name: c.name,
              }))}
              value={categoryId}
              onChange={setCategoryId}
              disabled={eligibleCategories.length === 0}
              placeholder="Sin categorizar"
              emptyLabel="Sin categorizar"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              className="tabular"
            />
          </Field>
          <Field label="Próxima ejecución" hint="Define día del mes/semana">
            <Input
              type="date"
              value={nextRun}
              onChange={(e) => setNextRun(e.target.value)}
              className="tabular"
            />
          </Field>
        </div>

        <label className="text-text-secondary flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoCreate}
            onChange={(e) => setAutoCreate(e.target.checked)}
            className="accent-[color:var(--purple-base)]"
          />
          Crear movimiento automáticamente cuando vence
        </label>

        {serverError && <p className="text-negative text-xs">{serverError}</p>}

        <DialogFooter className="sm:gap-2">
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
