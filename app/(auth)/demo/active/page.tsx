import Link from 'next/link'
import { Check } from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'

export const metadata = {
  title: 'Demo Aktif — SobatUMKM pro | ProMaP',
}

export default function DemoActivePage() {
  return (
    <AuthCard>
      <div className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
          <Check
            className="h-6 w-6 text-emerald-700 dark:text-emerald-200"
            aria-hidden="true"
          />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
          Demo Aktif — SobatUMKM pro
        </h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Sesi demo Anda aktif sebagai{' '}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">
            Hendra Wijaya (Manager IT Operasional)
          </strong>{'. '}
          Anda dapat langsung menjelajahi dashboard dengan data contoh lengkap.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-blue-500 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Masuk ke Dashboard
        </Link>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Sesi demo terisolasi dan siap dieksplorasi.
        </p>
      </div>

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
