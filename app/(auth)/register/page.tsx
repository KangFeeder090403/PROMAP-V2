'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'

import { registerSchema } from '@/lib/validations/auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type RegisterValues = z.infer<typeof registerSchema>

const LABEL = 'text-sm font-medium text-slate-700 dark:text-slate-200'
const INPUT =
  'h-9 w-full rounded-md border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400'
const ERR = 'text-xs text-red-600 dark:text-red-400'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(values: RegisterValues) {
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        password: values.password,
      }),
    })

    setLoading(false)
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Gagal mendaftar')
      return
    }

    router.push('/login?registered=1')
  }

  return (
    <AuthCard>
      <div className="px-6 pt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Daftar ProMaP
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Untuk karyawan perusahaan yang sudah terdaftar.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name" className={LABEL}>
            Nama
          </Label>
          <Input
            id="name"
            type="text"
            aria-invalid={!!errors.name}
            className={INPUT}
            {...register('name')}
          />
          {errors.name && <p className={ERR}>{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className={LABEL}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className={INPUT}
            {...register('email')}
          />
          {errors.email && <p className={ERR}>{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className={LABEL}>
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className={INPUT}
            {...register('password')}
          />
          {errors.password && <p className={ERR}>{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className={LABEL}>
            Konfirmasi Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            className={INPUT}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <p className={ERR}>{errors.confirmPassword.message}</p>}
        </div>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-9 w-full rounded-md bg-blue-500 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          {loading ? 'Mendaftar...' : 'Daftar'}
        </Button>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Akun baru berstatus Pending sampai disetujui Admin.
        </p>
      </form>

      <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="font-medium text-blue-500 transition-colors hover:underline"
          >
            Masuk
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
