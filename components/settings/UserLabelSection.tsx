'use client'

import { useEffect, useState, useMemo } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { Search, Plus, Download, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { UserLabelFormModal } from '@/components/settings/UserLabelFormModal'
import type { Company } from '@/components/settings/CompanySection'

export interface UserLabel {
  id: string
  name: string
  companyId: string
  status: 'PENDING' | 'ACTIVE' | 'REJECTED'
  requestedById?: string | null
  requestedBy?: { id: string; name: string; role: string } | null
  division?: { id: string; name: string } | null
  userCount?: number
}

// ── status config ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<UserLabel['status'], string> = {
  PENDING:  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  ACTIVE:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
}
const STATUS_LABEL: Record<UserLabel['status'], string> = {
  PENDING:  'Menunggu',
  ACTIVE:   'Active',
  REJECTED: 'Ditolak',
}
const STATUS_DOT: Record<UserLabel['status'], string> = {
  PENDING:  'bg-amber-500',
  ACTIVE:   'bg-emerald-500',
  REJECTED: 'bg-red-500',
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN_OPERATIONAL: 'Admin Operational',
  MANAGER: 'Manager', PIC: 'PIC', STAFF: 'Staff',
}

// ── component ──────────────────────────────────────────────────────────────────

export function UserLabelSection({ role, companyId }: { role: Role; companyId: string | null }) {
  const canManage = role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL'
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const [companies, setCompanies] = useState<Company[]>([])
  const [data, setData] = useState<UserLabel[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<UserLabel | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'PENDING' | 'ACTIVE' | 'REJECTED'>('')

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies()
    fetchData()
  }, [])

  async function fetchCompanies() {
    try {
      const res = await fetch('/api/companies')
      if (!res.ok) throw new Error()
      setCompanies(await res.json())
    } catch { /* silent */ }
  }

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/user-labels')
      if (!res.ok) throw new Error('Gagal memuat data')
      setData(await res.json())
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/user-labels/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeleting(null)
      fetchData()
    } catch {
      setError('Gagal menghapus label')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleApprove(id: string, action: 'approve' | 'reject') {
    setActionLoadingId(id)
    try {
      const res = await fetch(`/api/user-labels/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      fetchData()
    } catch {
      setError('Gagal memproses label')
    } finally {
      setActionLoadingId(null)
    }
  }

  // ── derived data ──────────────────────────────────────────────────────────────

  const pending = useMemo(() => data?.filter((l) => l.status === 'PENDING') ?? [], [data])

  const filtered = useMemo(() => {
    if (!data) return []
    let rows = data
    if (statusFilter) rows = rows.filter((l) => l.status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((l) => l.name.toLowerCase().includes(q))
    return rows
  }, [data, statusFilter, search])

  const counts = useMemo(() => {
    if (!data) return { all: 0, PENDING: 0, ACTIVE: 0, REJECTED: 0 }
    return data.reduce(
      (acc, l) => { acc.all++; acc[l.status] = (acc[l.status] ?? 0) + 1; return acc },
      { all: 0, PENDING: 0, ACTIVE: 0, REJECTED: 0 } as Record<string, number>
    )
  }, [data])

  // ── loading / error ───────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Info banner ── */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center mt-0.5">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
                Label Jabatan Dinamis (PRD §A3 &amp; §G3)
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 leading-relaxed">
                Manager dapat mengajukan usulan label baru yang membutuhkan verifikasi Admin Operational sebelum diaktifkan untuk
                menjaga standarisasi taksonomi organisasi.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-mono font-semibold text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2 py-1 rounded whitespace-nowrap">
            PRD-SPEC-V2.4
          </span>
        </div>
      </div>

      {/* ── Search + filter + action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari usulan label, manajer, atau divisi..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 flex-1">
          {([
            { key: '', label: 'Semua' },
            { key: 'PENDING', label: 'Pending', dot: true },
            { key: 'ACTIVE', label: 'Active' },
            { key: 'REJECTED', label: 'Rejected' },
          ] as const).map((f) => {
            const active = statusFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key as typeof statusFilter)}
                className={`inline-flex items-center gap-1 h-8 px-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {f.label}
                {'dot' in f && counts.PENDING > 0 && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                )}
              </button>
            )
          })}
        </div>

        {/* Ajukan button */}
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          {role === 'MANAGER' ? '+ Ajukan Label Baru' : '+ Label Baru'}
        </button>
      </div>

      {/* ── Antrean Persetujuan (PENDING, admin only) ── */}
      {canManage && pending.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Antrean Persetujuan Label
              </h3>
            </div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
              {pending.length} Items Pending
            </span>
          </div>

          {/* Pending cards */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pending.map((label) => (
              <div key={label.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 dark:text-slate-500 text-lg leading-none">⊳</span>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label.name}</h4>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                    Menunggu Verifikasi
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-0.5">
                      Diajukan Oleh
                    </p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {label.requestedBy?.name ?? 'Tidak diketahui'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {ROLE_LABEL[label.requestedBy?.role ?? ''] ?? label.requestedBy?.role ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-0.5">
                      Lingkup Tenant
                    </p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {companies.find((c) => c.id === label.companyId)?.name ?? 'Perusahaan'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Tenant Shared</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-0.5">
                      Divisi Terkait
                    </p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {label.division?.name ?? 'Semua Divisi'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {label.division ? 'Cluster' : 'General'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoadingId === label.id}
                    onClick={() => handleApprove(label.id, 'reject')}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Tolak (Reject)
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === label.id}
                    onClick={() => handleApprove(label.id, 'approve')}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Setujui (Approve)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Katalog Label Aktif ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Katalog Label Aktif (Active UserLabels)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daftar taksonomi label jabatan tersertifikasi di seluruh ekosistem operasional
              {companyId ? ' perusahaan ini' : ' organisasi'}.
            </p>
          </div>
          <button
            title="Export katalog"
            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {search ? 'Tidak ada label yang cocok.' : 'Belum ada label jabatan.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Nama Label
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-center">
                  User Aktif
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Divisi Pemilik
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Label name */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[l.status]}`} />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{l.name}</span>
                    </div>
                  </td>

                  {/* User count */}
                  <td className="px-5 py-3 text-center">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {l.userCount ?? '—'}
                    </span>
                  </td>

                  {/* Division */}
                  <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {l.division?.name ?? 'Semua Divisi'}
                  </td>

                  {/* Status badge */}
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLE[l.status]}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[l.status]}`} />
                      {STATUS_LABEL[l.status]}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3">
                    {canManage && (
                      <div className="flex items-center gap-2">
                        {l.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoadingId === l.id}
                              onClick={() => handleApprove(l.id, 'approve')}
                              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 disabled:opacity-50"
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === l.id}
                              onClick={() => handleApprove(l.id, 'reject')}
                              className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-50"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleting(l)}
                          title="Hapus label"
                          className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Error toast ── */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Modals ── */}
      <UserLabelFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        role={role}
        companies={companies}
        defaultCompanyId={companyId}
        onSuccess={() => { setFormOpen(false); fetchData() }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus Label Jabatan"
        message={`Yakin ingin menghapus "${deleting?.name}"?`}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  )
}
