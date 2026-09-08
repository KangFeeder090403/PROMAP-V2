'use client'

import { Suspense, useState } from 'react'

import { AuthHero } from '@/components/auth/AuthHero'
import { LoginForm } from '@/components/auth/LoginForm'
import { GuestDemoPanel } from '@/components/auth/GuestDemoPanel'
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TRIGGER =
  'h-8 rounded-sm text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-white dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white'

export default function LoginPage() {
  const [tab, setTab] = useState('enterprise')

  return (
    <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
      {/* Panel auth — tampil lebih dulu di mobile */}
      <div className="order-1 w-full lg:order-2 lg:justify-self-center">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800">
          <div className="px-6 pt-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Masuk ke Workspace
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Pilih cara masuk sesuai akun Anda.
            </p>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mx-6 mt-6 grid w-auto grid-cols-2 gap-1 dark:border-slate-700 dark:bg-slate-900">
              <TabsTrigger value="enterprise" className={TRIGGER}>
                Akun Perusahaan
              </TabsTrigger>
              <TabsTrigger value="guest" className={TRIGGER}>
                Coba Demo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enterprise" className="mt-0">
              <Suspense fallback={<AuthFormSkeleton fields={2} />}>
                <LoginForm />
              </Suspense>
            </TabsContent>

            <TabsContent value="guest" className="mt-0">
              <GuestDemoPanel />
            </TabsContent>
          </Tabs>

          {/*
            Calon klien belum punya perusahaan terdaftar — arahkan ke Guest Demo
            (tersimpan sebagai Lead untuk ditindaklanjuti), bukan ke /register
            yang membuat akun karyawan menunggu approval Admin.
          */}
          <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Perusahaan belum terdaftar?{' '}
              <button
                type="button"
                onClick={() => setTab('guest')}
                className="font-medium text-blue-500 transition-colors hover:underline"
              >
                Coba Demo Gratis
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="order-2 lg:order-1">
        <AuthHero />
      </div>
    </div>
  )
}
