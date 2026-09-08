'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, Clock, Mail, User } from 'lucide-react'
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
      <div className="p-5 sm:p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Demo Aktif</h2>
        <p className="text-sm text-slate-400 mb-6">
          Sesi demo Anda sedang berjalan. Jelajahi ProMaP dengan data contoh.
        </p>
        <Button
          onClick={() => {
            router.push('/')
            router.refresh()
          }}
          className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200"
        >
          Masuk ke Dashboard
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
        <p className="mt-3 text-xs text-slate-400">Sesi berlaku 2 jam sejak pendaftaran.</p>
      </div>
    )
  }

  if (phase === 'expired') {
    return (
      <div className="p-5 sm:p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-400/15 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6 text-amber-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Sesi Demo Berakhir</h2>
        <p className="text-sm text-slate-400 mb-6">
          Sesi demo Anda sudah habis. Daftar ulang atau buat akun.
        </p>
        <div className="space-y-2">
          <Button
            onClick={handleRestart}
            disabled={loading}
            className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg active:scale-[0.98] transition-all duration-200"
          >
            Mulai Ulang Demo
          </Button>
          <Link
            href="/register"
            className="block text-center text-xs font-semibold text-blue-400 hover:text-blue-300 mt-3 transition-colors"
          >
            Daftar Akun
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Alert */}
      <div className="p-3.5 rounded-xl bg-blue-500/[0.08] border border-blue-500/20 text-blue-200 text-xs space-y-1">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span>Jelajahi ProMaP secara gratis</span>
        </div>
        <p className="text-blue-200/70 leading-relaxed text-[11px]">
          Coba semua fitur dengan data contoh — tanpa perlu akun perusahaan. Sesi demo
          berlaku selama 2 jam, cukup untuk merasakan alur kerjanya.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
        <div>
          <Label htmlFor="guestName" className="text-xs font-semibold text-slate-200 mb-1 block">
            Nama Lengkap Pemohon
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" aria-hidden="true" />
            </div>
            <Input
              id="guestName"
              type="text"
              placeholder="Nama lengkap"
              aria-invalid={!!errors.name}
              className="w-full pl-9 pr-3 h-10 text-sm bg-white/[0.07] border-white/10 rounded-lg text-white placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500/60 focus-visible:bg-white/[0.1] focus-visible:ring-offset-0"
              {...register('name')}
            />
          </div>
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="guestEmail" className="text-xs font-semibold text-slate-200 mb-1 block">
            Email Bisnis
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" aria-hidden="true" />
            </div>
            <Input
              id="guestEmail"
              type="email"
              placeholder="nama@perusahaan.co.id"
              aria-invalid={!!errors.email}
              className="w-full pl-9 pr-3 h-10 text-sm bg-white/[0.07] border-white/10 rounded-lg text-white placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500/60 focus-visible:bg-white/[0.1] focus-visible:ring-offset-0"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <Label htmlFor="guestPhone" className="text-xs font-semibold text-slate-200 mb-1 block">
              No. Handphone / WA
            </Label>
            <Input
              id="guestPhone"
              type="tel"
              placeholder="0812-3456-7890"
              aria-invalid={!!errors.phone}
              className="w-full px-3 h-10 text-sm bg-white/[0.07] border-white/10 rounded-lg text-white placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500/60 focus-visible:bg-white/[0.1] focus-visible:ring-offset-0"
              {...register('phone')}
            />
            {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <Label htmlFor="guestCompany" className="text-xs font-semibold text-slate-200 mb-1 block">
              Nama Perusahaan
            </Label>
            <Input
              id="guestCompany"
              type="text"
              placeholder="PT Contoh"
              aria-invalid={!!errors.companyName}
              className="w-full px-3 h-10 text-sm bg-white/[0.07] border-white/10 rounded-lg text-white placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500/60 focus-visible:bg-white/[0.1] focus-visible:ring-offset-0"
              {...register('companyName')}
            />
            {errors.companyName && (
              <p className="text-xs text-red-400 mt-1">{errors.companyName.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            Sesi demo berakhir otomatis
          </span>
          <span className="text-blue-300 font-medium">Gratis, tanpa kartu kredit</span>
        </div>

        {error && (
          <p role="alert" aria-live="polite" className="text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg p-2.5">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="group w-full h-10 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-bold rounded-lg shadow-sm shadow-blue-600/30 hover:shadow-md hover:shadow-blue-600/30 flex items-center justify-center gap-2 transition-all duration-200"
        >
          <span>{loading ? 'Memulai...' : 'Mulai Akses Guest (Trial 2 Jam)'}</span>
          {!loading && (
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          )}
        </Button>
      </form>
    </div>
  )
}
