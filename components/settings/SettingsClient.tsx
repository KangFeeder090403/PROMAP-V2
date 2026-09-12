'use client'

import { useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { CompanySection } from '@/components/settings/CompanySection'
import { DivisionSection } from '@/components/settings/DivisionSection'
import { UserSection } from '@/components/settings/UserSection'
import { UserLabelSection } from '@/components/settings/UserLabelSection'

type Tab = 'company' | 'division' | 'user' | 'userLabel'

function defaultTabFor(role: Role): Tab {
  if (role === 'SUPER_ADMIN') return 'company'
  if (role === 'ADMIN_OPERATIONAL') return 'division'
  // MANAGER tidak punya akses tab Perusahaan/Divisi.
  return 'user'
}

export function SettingsClient({ role, companyId }: { role: Role; companyId: string | null }) {
  const [tab, setTab] = useState<Tab>(() => defaultTabFor(role))

  const showCompany = role === 'SUPER_ADMIN'
  const showDivision = role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL'
  const showUser = role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL' || role === 'MANAGER'
  const showUserLabel = role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL' || role === 'MANAGER'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Pengaturan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola entitas perusahaan, divisi, akun pengguna, dan label jabatan.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {showCompany && (
          <button
            type="button"
            onClick={() => setTab('company')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'company'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Perusahaan
          </button>
        )}
        {showDivision && (
          <button
            type="button"
            onClick={() => setTab('division')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'division'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Divisi
          </button>
        )}
        {showUser && (
          <button
            type="button"
            onClick={() => setTab('user')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'user'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            User
          </button>
        )}
        {showUserLabel && (
          <button
            type="button"
            onClick={() => setTab('userLabel')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'userLabel'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Label Jabatan
          </button>
        )}
      </div>

      {tab === 'company' && showCompany && <CompanySection role={role} />}
      {tab === 'division' && showDivision && <DivisionSection role={role} companyId={companyId} />}
      {tab === 'user' && showUser && <UserSection role={role} companyId={companyId} />}
      {tab === 'userLabel' && showUserLabel && (
        <UserLabelSection role={role} companyId={companyId} />
      )}
    </div>
  )
}
