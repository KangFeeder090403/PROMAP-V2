'use client'

import { useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { CompanySection } from '@/components/settings/CompanySection'
import { DivisionSection } from '@/components/settings/DivisionSection'
import { UserSection } from '@/components/settings/UserSection'
import { UserLabelSection } from '@/components/settings/UserLabelSection'

type Tab = 'company' | 'division' | 'user' | 'userLabel'

function defaultTabFor(role: Role): Tab {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL') return 'company'
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
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Pengaturan</h1>

      <div className="flex gap-1 border-b border-slate-200">
        {showCompany && (
          <button
            type="button"
            onClick={() => setTab('company')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
