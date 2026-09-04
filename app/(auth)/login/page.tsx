'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'

import { loginSchema } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit({ email, password }: LoginValues) {
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError('Email atau password salah')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center">
      <div className="w-full bg-white rounded-lg border border-slate-200 shadow-sm p-8 max-w-sm mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight text-center mb-6">
          ProMaP
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@contoh.com"
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
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
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
            {loading ? 'Masuk...' : 'Masuk'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          <Link href="/register" className="text-blue-500 hover:underline text-sm">
            Daftar Akun Baru
          </Link>
          {' · '}
          <Link href="/demo" className="text-blue-500 hover:underline text-sm">
            Coba Demo
          </Link>
        </div>
      </div>
    </div>
  )
}
