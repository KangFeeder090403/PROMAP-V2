'use client'

import { useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { CompanySection } from '@/components/settings/CompanySection'
import { DivisionSection } from '@/components/settings/DivisionSection'

type Tab = 'company' | 'division'

export function SettingsClient({ role, companyId }: { role: Role; companyId: string | null }) {
  const [tab, setTab] = useState<Tab>('company')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Pengaturan</h1>

      <div className="flex gap-1 border-b border-slate-200">
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
      </div>

      {tab === 'company' ? (
        <CompanySection role={role} />
      ) : (
        <DivisionSection role={role} companyId={companyId} />
      )}
    </div>
  )
}
