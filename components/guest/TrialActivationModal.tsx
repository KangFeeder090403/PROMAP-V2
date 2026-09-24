'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, CheckCircle2, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TrialActivationModal() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trialEndAt, setTrialEndAt] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('trial') === '1') {
      setOpen(true)
    }
  }, [searchParams])

  function handleClose() {
    setOpen(false)
    setError(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('trial')
    router.replace(url.pathname + (url.search ? url.search : ''))
  }

  async function handleActivate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/guest/activate-trial', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengaktifkan trial')
      }
      setSuccess(true)
      if (data.trialEndAt) {
        setTrialEndAt(
          new Date(data.trialEndAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        )
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan server.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 p-6 text-slate-100 shadow-2xl ring-1 ring-cyan-500/20">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup popup"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {success ? (
          <div className="text-center py-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 id="trial-modal-title" className="text-xl font-bold text-white mb-2">
              Trial 30 Hari Aktif!
            </h2>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Selamat! Akun uji coba Anda telah berhasil diaktifkan
              {trialEndAt ? ` hingga tanggal ${trialEndAt}` : ' selama 30 hari ke depan'}.
              Tim Super Admin kami telah menerima notifikasi dan akan segera menghubungi Anda.
            </p>
            <Button
              onClick={handleClose}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium h-10 rounded-lg transition-colors"
            >
              Lanjutkan Eksplorasi
            </Button>
          </div>
        ) : (
          <div>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="text-center mb-5">
              <h2 id="trial-modal-title" className="text-xl font-bold text-white tracking-tight">
                Aktivasi Trial 30 Hari
              </h2>
              <p className="mt-1.5 text-xs font-medium text-cyan-400 uppercase tracking-wider">
                Akses Eksklusif Fitur Lengkap
              </p>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-4 text-center">
              Fitur manajemen proyek dan pengaturan ini membutuhkan hak akses penuh perusahaan.
              Aktifkan uji coba <strong className="text-white">Trial 30 Hari</strong> secara gratis tanpa komitmen
              untuk membuka seluruh fitur ProMaP bersama tim Anda.
            </p>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 mb-5 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Akses penuh ke Projects, Action Plans, dan Governance</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Kolaborasi lintas divisi dengan pelacakan evidence</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Notifikasi otomatis dan dukungan penuh onboarding</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-300 text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={handleActivate}
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium h-10 rounded-lg shadow-lg shadow-cyan-950 transition-colors"
              >
                {loading ? 'Mengaktifkan...' : 'Aktifkan Trial 30 Hari Sekarang'}
              </Button>
              <Button
                onClick={handleClose}
                variant="ghost"
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs h-9"
              >
                Kembali ke Dashboard Demo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
