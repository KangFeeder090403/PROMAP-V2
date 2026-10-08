import { AuthTopBar } from '@/components/auth/AuthTopBar'
import { AuthSystemFooter } from '@/components/auth/AuthSystemFooter'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Auth pakai slate-100, bukan slate-50 — card putih perlu kontras dari latar
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 antialiased dark:bg-slate-900">
      <AuthTopBar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        {children}
      </main>

      <AuthSystemFooter />
    </div>
  )
}
