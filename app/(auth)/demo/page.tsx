import Link from 'next/link'

import { AuthCard } from '@/components/auth/AuthCard'
import { GuestDemoPanel } from '@/components/auth/GuestDemoPanel'

export default function DemoPage() {
  return (
    <AuthCard>
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-6">
        Coba Demo ProMaP
      </h1>

      <GuestDemoPanel />

      <p className="mt-6 pt-4 border-t border-slate-200 text-center text-sm text-slate-500">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-blue-500 hover:underline">
          Masuk
        </Link>
      </p>
    </AuthCard>
  )
}
