'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import type { z } from 'zod'

import { loginSchema } from '@/lib/validations/auth'
import { safeCallbackUrl } from '@/lib/auth-redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginValues = z.infer<typeof loginSchema>

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
    <div className="p-5 sm:p-6">
      {isSignedOut && (
        <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3 mb-5">
          <span>Sesi Anda sudah berakhir, silakan masuk lagi.</span>
        </div>
      )}

      {isRegistered && (
        <div className="flex items-center gap-2 text-[11px] text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-5">
          <span>Akun berhasil dibuat. Silakan masuk.</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-xs font-semibold text-slate-200 mb-1.5 block">
            Alamat Email
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" aria-hidden="true" />
            </div>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@perusahaan.co.id"
              aria-invalid={!!errors.email}
              className="w-full pl-9 pr-3 h-10 text-sm bg-white/[0.07] border-white/10 rounded-lg text-white placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500 focus-visible:bg-white/[0.1] focus-visible:ring-offset-0"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-200">
              Kata Sandi
            </Label>
            <a href="#reset" className="text-xs font-medium text-blue-400 hover:text-blue-300">
              Lupa kata sandi?
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" aria-hidden="true" />
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className="w-full pl-9 pr-10 h-10 text-sm bg-white/[0.07] border-white/10 rounded-lg text-white placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500 focus-visible:bg-white/[0.1] focus-visible:ring-offset-0"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg p-2.5"
          >
            {error}
          </p>
        )}

        {/* Primary CTA */}
        <Button
          type="submit"
          disabled={loading}
          className="group w-full h-10 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-semibold rounded-lg shadow-sm shadow-blue-600/30 hover:shadow-md hover:shadow-blue-500/30 flex items-center justify-center gap-2 transition-all duration-200"
        >
          <span>{loading ? 'Memproses...' : 'Masuk ke Workspace ProMaP'}</span>
          {!loading && (
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-transparent px-3 text-slate-500 text-[11px] font-medium uppercase">
            Atau lanjutkan dengan
          </span>
        </div>
      </div>

      {/* Google (setup menyusul via env) */}
      <button
        type="button"
        className="group w-full h-10 px-3 py-2 bg-white/[0.07] hover:bg-white/[0.12] active:scale-[0.98] border border-white/10 text-slate-200 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-200"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
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
    </div>
  )
}