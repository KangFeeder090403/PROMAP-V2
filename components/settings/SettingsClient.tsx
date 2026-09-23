'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { Role } from '@/lib/generated/prisma/client'
import { Building2, LayoutGrid, Users, Tag, TrendingUp, History } from 'lucide-react'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'

// Tanpa `ssr: false` — section ini tidak memakai API browser-only, jadi tetap
// ikut dirender di server (tab pertama langsung terisi) sambil tetap dipecah
// jadi chunk terpisah oleh dynamic().
const CompanySection = dynamic(
  () => import('@/components/settings/CompanySection').then((m) => m.CompanySection)
)
const DivisionSection = dynamic(
  () => import('@/components/settings/DivisionSection').then((m) => m.DivisionSection)
)
const UserSection = dynamic(
  () => import('@/components/settings/UserSection').then((m) => m.UserSection)
)
const UserLabelSection = dynamic(
  () => import('@/components/settings/UserLabelSection').then((m) => m.UserLabelSection)
)
const LeadSection = dynamic(
  () => import('@/components/settings/LeadSection').then((m) => m.LeadSection)
)
const AuditLogModal = dynamic(
  () => import('@/components/settings/AuditLogModal').then((m) => m.AuditLogModal),
  { ssr: false }
)

type Tab = 'company' | 'division' | 'user' | 'userLabel' | 'leads'

function defaultTabFor(role: Role): Tab {
  if (role === 'SUPER_ADMIN') return 'company'
  if (role === 'ADMIN_OPERATIONAL') return 'division'
  // MANAGER tidak punya akses tab Perusahaan/Divisi.
  return 'user'
}

// Tab config dengan ikon
const TAB_CONFIG: {
  key: Tab
  label: string
  shortLabel: string
  icon: React.ElementType
  roles: Role[]
}[] = [
  {
    key: 'company',
    label: 'Profil Perusahaan',
    shortLabel: 'Perusahaan',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
  },
  {
    key: 'division',
    label: 'Struktur Divisi',
    shortLabel: 'Divisi',
    icon: LayoutGrid,
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL'],
  },
  {
    key: 'user',
    label: 'Manajemen Pengguna & RBAC',
    shortLabel: 'Pengguna',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'],
  },
  {
    key: 'userLabel',
    label: 'Label Jabatan',
    shortLabel: 'Label Jabatan',
    icon: Tag,
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'],
  },
  {
    key: 'leads',
    label: 'Pipeline Prospek (Leads)',
    shortLabel: 'Leads',
    icon: TrendingUp,
    roles: ['SUPER_ADMIN'],
  },
]

export function SettingsClient({
  role,
  companyId,
  sessionUserId,
  initialTab,
}: {
  role: Role
  companyId: string | null
  sessionUserId?: string
  initialTab?: string
}) {
  const [tab, setTab] = useState<Tab>(() => {
    if (
      initialTab &&
      TAB_CONFIG.some((t) => t.key === initialTab && (t.roles as string[]).includes(role))
    ) {
      return initialTab as Tab
    }
    return defaultTabFor(role)
  })
  const [auditLogOpen, setAuditLogOpen] = useState(false)

  const visibleTabs = TAB_CONFIG.filter((t) => (t.roles as string[]).includes(role))
  const showSidebar = role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL' || role === 'MANAGER'

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Pengaturan &amp; Tata Kelola
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            Kelola konfigurasi perusahaan, struktur divisi, hak akses tim, approval jabatan, dan pipeline prospek.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAuditLogOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors cursor-pointer shadow-xs"
          >
            <History size={14} className="text-slate-500" />
            Audit Log Ringkas
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {visibleTabs.map((t) => {
          const Icon = t.icon
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.shortLabel}</span>
            </button>
          )
        })}
      </div>

      {/* ── 2-Column Content ── */}
      <div className={showSidebar ? 'grid grid-cols-1 xl:grid-cols-3 gap-6' : ''}>
        {/* Main content */}
        <div className={showSidebar ? 'xl:col-span-2' : ''}>
          {tab === 'company' && role === 'SUPER_ADMIN' && <CompanySection role={role} />}
          {tab === 'division' && (role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL') && (
            <DivisionSection role={role} companyId={companyId} />
          )}
          {tab === 'user' && (role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL' || role === 'MANAGER') && (
            <UserSection role={role} companyId={companyId} sessionUserId={sessionUserId} />
          )}
          {tab === 'userLabel' && (role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL' || role === 'MANAGER') && (
            <UserLabelSection role={role} companyId={companyId} />
          )}
          {tab === 'leads' && role === 'SUPER_ADMIN' && <LeadSection />}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="xl:col-span-1">
            <SettingsSidebar role={role} companyId={companyId} />
          </div>
        )}
      </div>

      {/* Audit Log Modal */}
      <AuditLogModal
        open={auditLogOpen}
        onOpenChange={setAuditLogOpen}
        companyId={companyId}
      />
    </div>
  )
}
