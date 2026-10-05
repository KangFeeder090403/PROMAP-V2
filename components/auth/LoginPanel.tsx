'use client'

import { Suspense, useState } from 'react'

import { LoginForm } from '@/components/auth/LoginForm'
import { GuestDemoPanel } from '@/components/auth/GuestDemoPanel'
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TRIGGER =
  'h-8 rounded-sm text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-white dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white'

export function LoginPanel({ googleEnabled }: { googleEnabled: boolean }) {
  const [tab, setTab] = useState('enterprise')

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800">
      <div className="px-5 pt-5 sm:px-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
          Masuk ke Workspace
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Pilih cara masuk sesuai akun Anda.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mx-5 mt-4 grid w-auto grid-cols-2 gap-1 sm:mx-6 dark:border-slate-700 dark:bg-slate-900">
          <TabsTrigger value="enterprise" className={TRIGGER}>
            Akun Perusahaan
          </TabsTrigger>
          <TabsTrigger value="guest" className={TRIGGER}>
            Coba Demo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enterprise" className="mt-0">
          <Suspense fallback={<AuthFormSkeleton fields={2} />}>
            <LoginForm googleEnabled={googleEnabled} />
          </Suspense>
        </TabsContent>

        <TabsContent value="guest" className="mt-0">
          <GuestDemoPanel />
        </TabsContent>
      </Tabs>

      {/*
        Self-register sudah dihapus: akun karyawan hanya dibuat Admin Operasional.
        Calon klien yang perusahaannya belum terdaftar diarahkan ke Guest Demo,
        yang tersimpan sebagai Lead untuk ditindaklanjuti tim sales.
      */}
      <div className="border-t border-slate-200 px-5 py-3 sm:px-6 dark:border-slate-700">
        <p className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
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
  )
}
