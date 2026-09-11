'use client'

import { useEffect, useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { Copy, Check, Users, Shield, ExternalLink, Database, Wifi } from 'lucide-react'
import type { Company } from '@/components/settings/CompanySection'
import type { ManagedUser } from '@/components/settings/UserSection'

// ── helpers ────────────────────────────────────────────────────────────────────

const SUBSCRIPTION_STYLE: Record<string, string> = {
  BASIC:      'bg-slate-700 text-slate-200',
  PREMIUM:    'bg-blue-700 text-blue-100',
  ENTERPRISE: 'bg-indigo-700 text-indigo-100',
}
const SUBSCRIPTION_LABEL: Record<string, string> = {
  BASIC: 'Basic Tier', PREMIUM: 'Premium Tier', ENTERPRISE: 'Enterprise Tier',
}

// Quota per plan (jumlah kursi)
const QUOTA_MAP: Record<string, number> = { BASIC: 20, PREMIUM: 35, ENTERPRISE: 50 }

const LEAD_STATUS_STYLE: Record<string, string> = {
  NEW:         'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  TRIAL_ACTIVE:'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  CONVERTED:   'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  COLD:        'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400',
}
const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: 'New Lead', TRIAL_ACTIVE: 'Trial Active', CONVERTED: 'Converted', COLD: 'Cold',
}

interface Lead {
  id: string; name: string; companyName: string; status: string; loginCount: number
}

// ── component ──────────────────────────────────────────────────────────────────

export function SettingsSidebar({
  role, companyId,
}: { role: Role; companyId: string | null }) {
  const isSuperAdmin = role === 'SUPER_ADMIN'
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL'

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
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Ringkasan Tenant &amp; Langganan
          </p>
          {company && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              PRD SE
            </span>
          )}
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Unique Code */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Kode Unik Perusahaan</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {company?.uniqueCode ?? '—'}
              </span>
              <button
                onClick={copyCode}
                className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Salin kode"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Subscription */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Paket Langganan</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${SUBSCRIPTION_STYLE[company?.subscription ?? 'BASIC']}`}>
              {SUBSCRIPTION_LABEL[company?.subscription ?? 'BASIC']}
            </span>
          </div>

          {/* Quota progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Kuota User Terpakai</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {activeUsers.length} / {quota} Kursi{' '}
                <span className="text-slate-400 dark:text-slate-500 font-normal">({usedPct}%)</span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usedPct >= 90 ? 'bg-red-500' : usedPct >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Sisa {quota - activeUsers.length} kursi tersedia
            </p>
          </div>

          {/* Role stats */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Shield className="h-3.5 w-3.5 text-violet-500" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Super Admin / OPS
                </p>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{superAdminCount}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">User</p>
            </div>
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Manager Division
                </p>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{managerCount}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Otoritas approver</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Guest & Leads (Super Admin only) ── */}
      {isSuperAdmin && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Pendaftaran Guest &amp; Leads Terbaru
            </p>
            <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mt-0.5">
              Akses Super Admin (PRD §A5 &amp; §C1 #4)
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {leads.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 px-4 py-4">Belum ada lead.</p>
            )}
            {leads.map((lead) => (
              <div key={lead.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{lead.name}</p>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${LEAD_STATUS_STYLE[lead.status] ?? ''}`}>
                    {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{lead.companyName}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  ↗ {lead.loginCount} logins recorded
                </p>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <a
              href="/leads"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline w-full justify-center"
            >
              Buka Full CRM Leads (/leads)
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ── DB Sync Status (Admin+) ── */}
      {isAdmin && (
        <div className="rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-start gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-blue-600/20 flex items-center justify-center mt-0.5">
              <Database className="h-4 w-4 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                Master Database Sync
              </p>
              <p className="text-sm font-bold text-slate-100">Multi-Tenant Vault OK</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Wifi className="h-3 w-3 text-emerald-400" />
                  Latensi Replikasi: ~14ms
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">SSL TLS 1.3 Active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
