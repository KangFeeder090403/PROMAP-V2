'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Role } from '@/lib/generated/prisma/client'
import { createDivisionSchema, updateDivisionSchema } from '@/lib/validations/division'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Division } from '@/components/settings/DivisionSection'
import type { Company } from '@/components/settings/CompanySection'

interface FormValues {
  name: string
  description?: string
  companyId?: string
}

export function DivisionFormModal({
  open,
  onOpenChange,
  role,
  division,
  companies,
  defaultCompanyId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role
  division: Division | null
  companies: Company[]
  defaultCompanyId: string | null
  onSuccess: () => void
}) {
  const mode: 'create' | 'edit' = division ? 'edit' : 'create'
  // Selector companyId hanya untuk SUPER_ADMIN saat create (PRD: ADMIN_OPERATIONAL
  // companyId auto dari session, edit tidak boleh pindah company).
  const showCompanySelect = mode === 'create' && role === 'SUPER_ADMIN'
  const schema = showCompanySelect ? createDivisionSchema : updateDivisionSchema

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    reset({
      name: division?.name ?? '',
      description: division?.description ?? '',
      companyId: division?.companyId ?? defaultCompanyId ?? '',
    })
  }, [open, division, defaultCompanyId, reset])

  async function onSubmit(values: FormValues) {
    setSubmitError('')
    setLoading(true)

    const url = mode === 'create' ? '/api/divisions' : `/api/divisions/${division!.id}`
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
        setError('name', { message: data.error || 'Nama divisi sudah dipakai' })
        return
      }
      setSubmitError(data.error || 'Gagal menyimpan divisi')
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {mode === 'create' ? 'Divisi Baru' : 'Edit Divisi'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {showCompanySelect && (
            <div className="space-y-1.5">
              <Label htmlFor="companyId" className="text-slate-700">
                Perusahaan
              </Label>
              <select
                id="companyId"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...register('companyId')}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.companyId && <p className="text-sm text-red-600">{errors.companyId.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700">
              Nama
            </Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-slate-700">
              Deskripsi
            </Label>
            <Input id="description" {...register('description')} />
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
