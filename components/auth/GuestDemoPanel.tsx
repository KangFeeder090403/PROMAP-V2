'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Clock, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const guestSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  phone: z.string().min(5, 'Nomor telepon minimal 5 karakter'),
  companyName: z.string().min(2, 'Nama perusahaan minimal 2 karakter'),
})

type GuestValues = z.infer<typeof guestSchema>

type Phase = 'active' | 'expired' | 'form'

const LABEL = 'text-sm font-medium text-slate-700 dark:text-slate-200'
const INPUT =
  'h-9 w-full rounded-md border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400'
const CTA =
  'h-9 w-full rounded-md bg-blue-500 text-sm font-medium text-white transition-colors hover:bg-blue-600'

export function GuestDemoPanel() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('form')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const generation = useRef(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestValues>({ resolver: zodResolver(guestSchema) })

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch('/api/guest/session')
        const data = await res.json()
        if (cancelled) return
        if (data.active) {
          setPhase('active')
        } else if (data.exp && Date.now() >= data.exp) {
          setPhase('expired')
        }
      } catch {
        // abaikan — biarkan form tampil apa adanya
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(values: GuestValues) {
    setError('')
    setLoading(true)
    const gen = ++generation.current

    try {
      const res = await fetch('/api/guest/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (gen !== generation.current) return

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Gagal memulai demo')
        setLoading(false)
        return
      }

      // NOSONAR: Public demo persona credentials for prospective guest visitors (PRD §Demo Persona).
      const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? 'hendra.sobat@promap.id'
      const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || ''
      await signIn('credentials', {
        email: demoEmail,
        password: demoPassword,
        redirect: false,
      })

      router.push('/demo/active')
      setPhase('active')
    } catch {
      if (gen === generation.current) {
        setError('Gagal menghubungi server. Coba lagi.')
      }
    } finally {
      if (gen === generation.current) setLoading(false)
    }
  }

  function handleRestart() {
    generation.current++
    setPhase('form')
    setError('')
    setLoading(false)
  }

  if (phase === 'active') {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
          <Check
            className="h-6 w-6 text-emerald-700 dark:text-emerald-200"
            aria-hidden="true"
          />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          Demo Aktif — SobatUMKM pro
        </h2>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Sesi demo Anda aktif sebagai <strong className="font-semibold text-slate-800 dark:text-slate-200">Hendra Wijaya (Manager IT Operasional)</strong>. Anda dapat langsung menjelajahi dashboard dengan data contoh lengkap.
        </p>
        <Button
          onClick={() => {
            router.push('/dashboard')
            router.refresh()
          }}
          className={CTA}
        >
          Masuk ke Dashboard
        </Button>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Sesi demo terisolasi dan siap dieksplorasi.
        </p>
      </div>
    )
  }

  if (phase === 'expired') {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <Clock className="h-6 w-6 text-amber-700 dark:text-amber-200" aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          Sesi Demo Berakhir
        </h2>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Sesi demo Anda sudah habis. Mulai ulang demo, atau hubungi Admin
          Operasional perusahaan Anda untuk dibuatkan akun.
        </p>
        <Button onClick={handleRestart} disabled={loading} className={CTA}>
          Mulai Ulang Demo
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Lihat isi ProMaP dengan data contoh. Sesi berlaku 2 jam, tanpa perlu akun
        perusahaan.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="guestName" className={LABEL}>
            Nama Lengkap
          </Label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              id="guestName"
              type="text"
              placeholder="Hendra Gunawan"
              aria-invalid={!!errors.name}
              className={`${INPUT} pl-9`}
              {...register('name')}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="guestEmail" className={LABEL}>
            Email Bisnis
          </Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              id="guestEmail"
              type="email"
              placeholder="nama@perusahaan.co.id"
              aria-invalid={!!errors.email}
              className={`${INPUT} pl-9`}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="guestPhone" className={LABEL}>
              Telepon
            </Label>
            <Input
              id="guestPhone"
              type="tel"
              placeholder="0812-3456-7890"
              aria-invalid={!!errors.phone}
              className={INPUT}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guestCompany" className={LABEL}>
              Perusahaan
            </Label>
            <Input
              id="guestCompany"
              type="text"
              placeholder="PT Maju Logistik"
              aria-invalid={!!errors.companyName}
              className={INPUT}
              {...register('companyName')}
            />
            {errors.companyName && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors.companyName.message}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sesi demo berakhir otomatis setelah 2 jam.
        </p>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className={CTA}>
          {loading ? 'Memulai...' : 'Mulai Demo'}
        </Button>
      </form>
    </div>
  )
}
