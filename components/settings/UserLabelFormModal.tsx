'use client'

import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Role } from '@/lib/generated/prisma/client'
import { createUserLabelSchema } from '@/lib/validations/userLabel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Company } from '@/components/settings/CompanySection'
import type { UserLabel } from '@/components/settings/UserLabelSection'

const PRESETS = ['PKL', 'MAGANG', 'FREELANCE', 'STAFF', 'LEADER', 'PIC', 'SPV', 'MANAGER', 'DIREKTUR', 'OWNER'] as const
const CUSTOM = '__custom__'
const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface FormValues {
  name: string
  companyId?: string
}

export function UserLabelFormModal({
  open,
  onOpenChange,
  role,
  companies,
  defaultCompanyId,
  existingLabels,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role
  companies: Company[]
  defaultCompanyId: string | null
  existingLabels: Pick<UserLabel, 'name' | 'companyId' | 'status'>[]
  onSuccess: () => void
}) {
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [choice, setChoice] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(createUserLabelSchema) as Resolver<FormValues> })

  const watchedCompanyId = watch('companyId')
  const targetCompanyId = isSuperAdmin ? watchedCompanyId : defaultCompanyId
  const taken = new Set(
    existingLabels
      .filter((l) => l.companyId === targetCompanyId && l.status !== 'REJECTED')
      .map((l) => l.name.trim().toLowerCase()),
  )

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    setChoice('')
    reset({ name: '', companyId: defaultCompanyId ?? '' })
  }, [open, defaultCompanyId, reset])

  // SUPER_ADMIN ganti perusahaan: preset terpilih bisa jadi "sudah ada" di perusahaan baru
  useEffect(() => {
    if (choice && choice !== CUSTOM && taken.has(choice.toLowerCase())) {
      setChoice('')
      setValue('name', '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCompanyId])

  function onChoiceChange(value: string) {
    setChoice(value)
    setValue('name', value === CUSTOM ? '' : value, { shouldValidate: value !== CUSTOM && value !== '' })
  }

  async function onSubmit(values: FormValues) {
    if (isSuperAdmin && !values.companyId) {
      setSubmitError('Perusahaan wajib dipilih')
      return
    }

    setSubmitError('')
    setLoading(true)

    const res = await fetch('/api/user-labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSubmitError(data.error || 'Gagal menyimpan label')
      return
    }

    onSuccess()
  }

  const title = role === 'MANAGER' ? 'Usulkan Label Baru' : 'Label Baru'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name-preset">
              Nama Label
            </Label>
            <select
              id="name-preset"
              value={choice}
              onChange={(e) => onChoiceChange(e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={SELECT_CLASS}
            >
              <option value="">Pilih label</option>
              {PRESETS.map((p) => {
                const exists = taken.has(p.toLowerCase())
                return (
                  <option key={p} value={p} disabled={exists}>
                    {exists ? `${p} (sudah ada)` : p}
                  </option>
                )
              })}
              <option value={CUSTOM}>Lainnya (custom)</option>
            </select>
            {choice === CUSTOM && (
              <Input
                aria-label="Nama label custom"
                placeholder="Tulis nama label"
                maxLength={50}
                autoFocus
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                {...register('name')}
              />
            )}
            {errors.name && <p id="name-error" className="text-sm text-destructive-text">{errors.name.message}</p>}
          </div>

          {isSuperAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="companyId">
                Perusahaan
              </Label>
              <select
                id="companyId"
                className={SELECT_CLASS}
                {...register('companyId')}
              >
                <option value="">Pilih perusahaan</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {submitError && <p className="text-sm text-destructive-text">{submitError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-input bg-card hover:bg-accent text-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
