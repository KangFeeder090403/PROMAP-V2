import { AuthTopBar } from '@/components/auth/AuthTopBar'
import { AuthSystemFooter } from '@/components/auth/AuthSystemFooter'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-800 antialiased flex flex-col justify-between">
      <AuthTopBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex items-center justify-center">
        {children}
      </main>

      <AuthSystemFooter />
    </div>
  )
}
