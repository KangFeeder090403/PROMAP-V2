import { Suspense } from 'react'
import Link from 'next/link'

import { AuthHero } from '@/components/auth/AuthHero'
import { LoginForm } from '@/components/auth/LoginForm'
import { GuestDemoPanel } from '@/components/auth/GuestDemoPanel'
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LoginPage() {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start lg:items-center">
      {/* Right-first on mobile: Glass login panel */}
      <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-5 w-full animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
        <div className="rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20 overflow-hidden">
          {/* Panel header + tabs */}
          <div className="pt-7 pb-0">
            <div className="px-6 pb-5">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Masuk ke Workspace
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pilih metode autentikasi sesuai otorisasi Anda
              </p>
            </div>

            <Tabs defaultValue="enterprise">
              <TabsList className="w-full justify-start gap-8 rounded-none bg-transparent h-auto p-0 border-0 border-b border-white/10">
                <TabsTrigger
                  value="enterprise"
                  className="px-6 pb-3.5 pt-0 text-xs font-semibold text-slate-400 rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-blue-400 data-[state=active]:border-blue-500 data-[state=active]:shadow-none hover:text-slate-200 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  Akun Perusahaan
                </TabsTrigger>
                <TabsTrigger
                  value="guest"
                  className="gap-1.5 px-6 pb-3.5 pt-0 text-xs font-medium text-slate-400 rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-blue-400 data-[state=active]:border-blue-500 data-[state=active]:shadow-none hover:text-slate-200 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  Guest Demo
                  <span className="bg-blue-500/15 text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    Trial
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="enterprise"
                className="mt-0 focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
              >
                <Suspense fallback={<AuthFormSkeleton fields={3} />}>
                  <LoginForm />
                </Suspense>
              </TabsContent>

              <TabsContent
                value="guest"
                className="mt-0 focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
              >
                <GuestDemoPanel />
              </TabsContent>
            </Tabs>
          </div>

          {/* Register strip */}
          <div className="px-6 pb-6">
            <Link
              href="/register"
              className="block text-center text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors duration-200"
            >
              Perusahaan belum terdaftar?{' '}
              <span className="font-semibold text-blue-400 hover:underline">
                Jadwalkan Onboarding &amp; Demo
              </span>
            </Link>
          </div>

          {/* Panel footer */}
          <div className="bg-white/[0.04] px-6 py-3.5 border-t border-white/[0.08] flex items-center justify-center text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
              Aman. Terpercaya. Siap membantu tim Anda.
            </span>
          </div>
        </div>
      </div>

      {/* Left on desktop: Hero */}
      <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-7 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 ease-out">
        <AuthHero />
      </div>
    </div>
  )
}