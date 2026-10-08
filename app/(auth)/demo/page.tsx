import Link from 'next/link'

import { AuthCard } from '@/components/auth/AuthCard'
import { GuestDemoPanel } from '@/components/auth/GuestDemoPanel'

export default function DemoPage() {
  return (
    <AuthCard>
      <div className="px-6 pt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Coba Demo ProMaP
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Isi data singkat, langsung masuk dengan data contoh.
        </p>
      </div>

      <GuestDemoPanel />

      <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="font-medium text-blue-500 dark:text-blue-300 transition-colors hover:underline"
          >
            Masuk
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
