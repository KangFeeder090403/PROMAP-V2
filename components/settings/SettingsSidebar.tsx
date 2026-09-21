'use client'

import { useEffect, useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { Copy, Check, Users, Shield, ExternalLink } from 'lucide-react'
import type { Company } from '@/components/settings/CompanySection'
import type { ManagedUser } from '@/components/settings/UserSection'

// ── helpers ────────────────────────────────────────────────────────────────────

const SUBSCRIPTION_STYLE: Record<string, string> = {
  BASIC:      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PREMIUM:    'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  ENTERPRISE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
}
const SUBSCRIPTION_LABEL: Record<string, string> = {
  BASIC: 'Paket Basic', PREMIUM: 'Paket Premium', ENTERPRISE: 'Paket Enterprise',
}

// Quota per plan (jumlah kursi)
const QUOTA_MAP: Record<string, number> = { BASIC: 20, PREMIUM: 35, ENTERPRISE: 50 }

const LEAD_STATUS_STYLE: Record<string, string> = {
  NEW:         'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  TRIAL_ACTIVE:'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  CONVERTED:   'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  COLD:        'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400',
}
const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: 'Baru', TRIAL_ACTIVE: 'Trial Aktif', CONVERTED: 'Klien Aktif', COLD: 'Tidak Aktif',
}

interface Lead {
  id: string; name: string; companyName: string; status: string; loginCount: number
}

// ── component ──────────────────────────────────────────────────────────────────

export function SettingsSidebar({
  role, companyId,
}: { role: Role; companyId: string | null }) {
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const [company, setCompany] = useState<Company | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchCompany()
    fetchUsers()
    if (isSuperAdmin) fetchLeads()
  }, [])

  async function fetchCompany() {
    try {
      const res = await fetch('/api/companies')
      if (!res.ok) return
      const list: Company[] = await res.json()
      // For non-super-admin, get own company; for super-admin, show first
      if (companyId) setCompany(list.find((c) => c.id === companyId) ?? list[0] ?? null)
      else setCompany(list[0] ?? null)
    } catch { /* silent */ }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) return
      setUsers(await res.json())
    } catch { /* silent */ }
  }

  async function fetchLeads() {
    try {
      const res = await fetch('/api/leads')
      if (!res.ok) return
      const data: Lead[] = await res.json()
      setLeads(data.slice(0, 2))
    } catch { /* silent */ }
  }

  function copyCode() {
    if (!company) return
    navigator.clipboard.writeText(company.uniqueCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const activeUsers = users.filter((u) => u.status === 'ACTIVE' && !u.isGuest)
  const quota = QUOTA_MAP[company?.subscription ?? 'BASIC'] ?? 50
  const usedPct = Math.min(100, Math.round((activeUsers.length / quota) * 100))

  const superAdminCount = users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN_OPERATIONAL').length
  const managerCount    = users.filter((u) => u.role === 'MANAGER').length

  return (
    <div className="space-y-4 sticky top-6">
      {/* ── Tenant & Subscription Summary ── */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-sm transition-shadow">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Langganan & Kuota Tenant
            </p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SUBSCRIPTION_STYLE[company?.subscription ?? 'BASIC']}`}>
            {SUBSCRIPTION_LABEL[company?.subscription ?? 'BASIC']}
          </span>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Unique Code */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Kode Unik</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
                {company?.uniqueCode ?? '—'}
              </span>
              <button
                onClick={copyCode}
                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Salin kode"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Quota progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Penggunaan Kursi</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {activeUsers.length} <span className="font-normal text-slate-400">/ {quota}</span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usedPct >= 90 ? 'bg-red-500' : usedPct >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>{usedPct}% terpakai</span>
              <span>Sisa {Math.max(0, quota - activeUsers.length)} kursi</span>
            </div>
          </div>

          {/* Role stats */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[11px] font-medium">Super Admin</span>
              </div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{superAdminCount}</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <Users className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[11px] font-medium">Manager</span>
              </div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{managerCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Guest & Leads (Super Admin only) ── */}
      {isSuperAdmin && (
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-sm transition-shadow">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Pendaftaran Leads Baru
              </p>
            </div>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              Super Admin
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {leads.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 px-4 py-4">Belum ada lead.</p>
            )}
            {leads.map((lead) => (
              <div key={lead.id} className="px-4 py-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{lead.name}</p>
                  <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${LEAD_STATUS_STYLE[lead.status] ?? ''}`}>
                    {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="truncate">{lead.companyName}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">{lead.loginCount}x login</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
            <a
              href="/leads"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Lihat semua leads
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
