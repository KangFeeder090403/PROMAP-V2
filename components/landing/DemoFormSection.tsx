import { ShieldCheck } from 'lucide-react'
import { GuestDemoPanel } from '@/components/auth/GuestDemoPanel'

export function DemoFormSection() {
  return (
    <section
      id="demo"
      className="relative overflow-hidden bg-white py-16 sm:py-20 dark:bg-slate-900"
    >
      {/* Subtle radial gradient background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50 via-white to-white opacity-70 dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Uji Coba · Gratis 30 Hari
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Mulai Uji Coba Demo ProMaP Sekarang
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Rasakan langsung seluruh fitur ProMaP dalam sesi demo dengan data contoh realistis.
          </p>
        </div>

        {/* Form card — reuse the existing GuestDemoPanel */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-800 dark:shadow-slate-900/60">
          <GuestDemoPanel />
        </div>

        {/* Trust badge */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <span>
            Kami tidak akan menjual data Anda untuk iklan. Akses 72 jam tersedia gratis untuk tim.
          </span>
        </div>
      </div>
    </section>
  )
}
