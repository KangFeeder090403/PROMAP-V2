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
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-6">
        Daftar ProMaP
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-slate-700">
            Nama
          </Label>
          <Input
            id="name"
            type="text"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-slate-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-slate-700">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-slate-700">
            Konfirmasi Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600 bg-red-50 rounded-md p-2"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white w-full"
        >
          {loading ? 'Mendaftar...' : 'Daftar'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-blue-500 hover:underline text-sm">
          Masuk
        </Link>
      </p>
      <p className="text-xs text-slate-400 text-center mt-1">
        Status akun baru: Pending — butuh approval Admin.
      </p>
    </AuthCard>
  )
}
