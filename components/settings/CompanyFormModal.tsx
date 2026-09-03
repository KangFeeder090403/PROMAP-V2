'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Role } from '@/lib/generated/prisma/client'
import {
  createCompanySchema,
  updateCompanySchema,
  updateCompanySchemaSuperAdmin,
} from '@/lib/validations/company'
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
  uniqueCode?: string
  subscription?: 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  logoUrl?: string
  isActive: boolean
}

export function CompanyFormModal({
  open,
  onOpenChange,
  role,
  company,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role
  company: Company | null
  onSuccess: () => void
}) {
  const mode: 'create' | 'edit' = company ? 'edit' : 'create'
  const showSubscriptionFields = mode === 'create' || role === 'SUPER_ADMIN'

  const schema = useMemo(() => {
    if (mode === 'create') return createCompanySchema
    return role === 'SUPER_ADMIN' ? updateCompanySchemaSuperAdmin : updateCompanySchema
  }, [mode, role])

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> })

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    reset({
      name: company?.name ?? '',
      uniqueCode: company?.uniqueCode ?? '',
      subscription: company?.subscription ?? 'BASIC',
      logoUrl: company?.logoUrl ?? '',
      isActive: company?.isActive ?? true,
    })
  }, [open, company, reset])

  async function onSubmit(values: FormValues) {
    setSubmitError('')
    setLoading(true)

    const url = mode === 'create' ? '/api/companies' : `/api/companies/${company!.id}`
    const method = mode === 'create' ? 'POST' : 'PUT'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setError('uniqueCode', { message: data.error || 'Kode unik sudah dipakai' })
        return
      }
      setSubmitError(data.error || 'Gagal menyimpan perusahaan')
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {mode === 'create' ? 'Perusahaan Baru' : 'Edit Perusahaan'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700">
              Nama
            </Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {showSubscriptionFields && (
            <div className="space-y-1.5">
              <Label htmlFor="uniqueCode" className="text-slate-700">
                Kode Unik
              </Label>
              <Input id="uniqueCode" aria-invalid={!!errors.uniqueCode} {...register('uniqueCode')} />
              {errors.uniqueCode && <p className="text-sm text-red-600">{errors.uniqueCode.message}</p>}
            </div>
          )}

          {showSubscriptionFields && (
            <div className="space-y-1.5">
              <Label htmlFor="subscription" className="text-slate-700">
                Subscription
              </Label>
              <select
                id="subscription"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...register('subscription')}
              >
                <option value="BASIC">BASIC</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
              {errors.subscription && (
                <p className="text-sm text-red-600">{errors.subscription.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="logoUrl" className="text-slate-700">
              Logo URL
            </Label>
            <Input id="logoUrl" aria-invalid={!!errors.logoUrl} {...register('logoUrl')} />
            {errors.logoUrl && <p className="text-sm text-red-600">{errors.logoUrl.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
              {...register('isActive')}
            />
            <Label htmlFor="isActive" className="text-slate-700">
              Aktif
            </Label>
          </div>

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
