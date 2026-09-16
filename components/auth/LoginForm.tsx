'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import type { z } from 'zod'

import { loginSchema } from '@/lib/validations/auth'
import { safeCallbackUrl } from '@/lib/auth-redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginValues = z.infer<typeof loginSchema>

const INPUT =
  'h-9 w-full rounded-md border-slate-300 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isSignedOut = searchParams.get('signout') === '1'
  const isRegistered = searchParams.get('registered') === '1'

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

    router.push(safeCallbackUrl(searchParams.get('callbackUrl')))
    router.refresh()
  }

  return (
    <div className="p-6">
      {isSignedOut && (
        <p className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Sesi Anda sudah berakhir, silakan masuk lagi.
        </p>
      )}

      {isRegistered && (
        <p className="mb-5 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          Akun berhasil dibuat. Silakan masuk.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Alamat Email
          </Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@perusahaan.co.id"
              aria-invalid={!!errors.email}
              className={INPUT}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Kata Sandi
          </Label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className={`${INPUT} pr-10`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className="absolute right-0 top-0 flex h-9 w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-slate-200"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
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
          {loading ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Akses Cepat Pengujian
          </span>
        </div>
      </div>

      {/* Quick Access Akun Demo */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            setError('')
            const res = await signIn('credentials', {
              email: 'hendra.sobat@promap.id',
              password: 'Demo12345',
              redirect: false,
            })
            setLoading(false)
            if (res?.error) {
              setError('Akun demo belum aktif atau database belum di-seed.')
              return
            }
            router.push('/')
            router.refresh()
          }}
          className="h-9 w-full rounded-md border-dashed border-blue-300 bg-blue-50/60 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/60"
        >
          ⚡ Masuk Cepat: Manager (Hendra Wijaya - SobatUMKM pro)
        </Button>
      </div>

      {/*
        SSO Google — provider belum dikonfigurasi.
        Cara mengaktifkan: daftarkan GoogleProvider di lib/auth.ts, isi
        GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET di .env.local, lalu ganti
        `disabled` di bawah dengan onClick={() => signIn('google')}.
      */}
      <button
        type="button"
        disabled
        title="Login Google belum aktif"
        className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Lanjut dengan Google</span>
      </button>
      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Login Google akan aktif setelah dikonfigurasi.
      </p>
    </div>
  )
}
