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
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role
  companies: Company[]
  defaultCompanyId: string | null
  onSuccess: () => void
}) {
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(createUserLabelSchema) as Resolver<FormValues> })

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    reset({ name: '', companyId: defaultCompanyId ?? '' })
  }, [open, defaultCompanyId, reset])

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700">
              Nama Label
            </Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {isSuperAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="companyId" className="text-slate-700">
                Perusahaan
              </Label>
              <select
                id="companyId"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
