'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Role } from '@/lib/generated/prisma/client'
import { createUserSchema, updateUserSchema } from '@/lib/validations/user'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Company } from '@/components/settings/CompanySection'
import type { Division } from '@/components/settings/DivisionSection'
import type { UserLabel } from '@/components/settings/UserLabelSection'
import type { ManagedUser } from '@/components/settings/UserSection'

interface FormValues {
  email?: string
  name?: string
  password?: string
  phone?: string
  role?: Role
  companyId?: string
  divisionId?: string
  userLabelId?: string
  supervisorId?: string
}

// Role apa saja yang boleh dipilih di dropdown, per role session.
// ADMIN_OPERATIONAL tidak boleh melihat/memilih SUPER_ADMIN — defense-in-depth
// karena backend POST /api/users tidak memvalidasi role sama sekali.
function assignableRoles(sessionRole: Role): Role[] {
  if (sessionRole === 'SUPER_ADMIN') return ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC']
  return ['ADMIN_OPERATIONAL', 'MANAGER', 'PIC']
}

export function UserFormModal({
  open,
  onOpenChange,
  role,
  user,
  companies,
  divisions,
  userLabels,
  users,
  defaultCompanyId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role
  user: ManagedUser | null
  companies: Company[]
  divisions: Division[]
  userLabels: UserLabel[]
  users: ManagedUser[]
  defaultCompanyId: string | null
  onSuccess: () => void
}) {
  const mode: 'create' | 'edit' = user ? 'edit' : 'create'
  const isSuperAdmin = role === 'SUPER_ADMIN'
  const roleOptions = useMemo(() => assignableRoles(role), [role])

  const schema = mode === 'create' ? createUserSchema : updateUserSchema

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> })

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    if (mode === 'edit' && user) {
      reset({
        role: user.role,
        companyId: user.companyId ?? '',
        divisionId: user.divisionId ?? '',
        userLabelId: user.userLabelId ?? '',
        supervisorId: user.supervisorId ?? '',
      })
    } else {
      reset({
        email: '',
        name: '',
        password: '',
        phone: '',
        role: 'PIC',
        companyId: isSuperAdmin ? '' : defaultCompanyId ?? '',
        divisionId: '',
        userLabelId: '',
        supervisorId: '',
      })
    }
  }, [open, mode, user, isSuperAdmin, defaultCompanyId, reset])

  const watchedCompanyId = watch('companyId')
  const effectiveCompanyId =
    mode === 'edit' ? user?.companyId ?? '' : isSuperAdmin ? watchedCompanyId : defaultCompanyId ?? ''

  const scopedDivisions = divisions.filter((d) => d.companyId === effectiveCompanyId)
  const scopedLabels = userLabels.filter((l) => l.companyId === effectiveCompanyId)
  const scopedSupervisors = users.filter(
    (u) => u.companyId === effectiveCompanyId && u.id !== user?.id
  )
  const relationsDisabled = !effectiveCompanyId

  async function onSubmit(values: FormValues) {
    setSubmitError('')
    setLoading(true)

    const payload =
      mode === 'create'
        ? {
            email: values.email,
            name: values.name,
            password: values.password,
            phone: values.phone || undefined,
            role: values.role,
            companyId: isSuperAdmin ? values.companyId : undefined,
            divisionId: values.divisionId || null,
            userLabelId: values.userLabelId || null,
            supervisorId: values.supervisorId || null,
          }
        : {
            role: values.role,
            divisionId: values.divisionId || null,
            userLabelId: values.userLabelId || null,
            supervisorId: values.supervisorId || null,
          }

    const url = mode === 'create' ? '/api/users' : `/api/users/${user!.id}`
    const method = mode === 'create' ? 'POST' : 'PUT'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setError('email' as keyof FormValues, { message: data.error || 'Email sudah terdaftar' })
        return
      }
      setSubmitError(data.error || 'Gagal menyimpan user')
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {mode === 'create' ? 'User Baru' : 'Edit User'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {mode === 'create' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-700">
                  Nama
                </Label>
                <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700">
                  Email
                </Label>
                <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-700">
                  Password
                </Label>
                <Input id="password" type="password" aria-invalid={!!errors.password} {...register('password')} />
                {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-slate-700">
                  No HP
                </Label>
                <Input id="phone" {...register('phone')} />
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
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-slate-700">
              Role
            </Label>
            <select
              id="role"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('role')}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="divisionId" className="text-slate-700">
              Divisi
            </Label>
            <select
              id="divisionId"
              disabled={relationsDisabled}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
              {...register('divisionId')}
            >
              <option value="">Tidak ada</option>
              {scopedDivisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="userLabelId" className="text-slate-700">
              Label Jabatan
            </Label>
            <select
              id="userLabelId"
              disabled={relationsDisabled}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
              {...register('userLabelId')}
            >
              <option value="">Tidak ada</option>
              {scopedLabels
                .filter((l) => l.status === 'ACTIVE')
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supervisorId" className="text-slate-700">
              Supervisor
            </Label>
            <select
              id="supervisorId"
              disabled={relationsDisabled}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
              {...register('supervisorId')}
            >
              <option value="">Tidak ada</option>
              {scopedSupervisors.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
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
