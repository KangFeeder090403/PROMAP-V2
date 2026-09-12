'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Search,
  RefreshCw,
  Phone,
  Mail,
  Building,
  TrendingUp,
  Clock,
  Sparkles,
  FileEdit,
  Save,
  X,
} from 'lucide-react'

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  companyName: string
  status: 'NEW' | 'TRIAL_ACTIVE' | 'CONVERTED' | 'COLD'
  loginCount: number
  lastLoginAt: string | null
  notes: string | null
  createdAt: string
}

const LEAD_STATUS_CONFIG = {
  NEW: {
    label: 'New Lead',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  TRIAL_ACTIVE: {
    label: 'Trial Active',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  CONVERTED: {
    label: 'Converted',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  COLD: {
    label: 'Cold Lead',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
  },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function LeadSection() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState<string>('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/leads')
      if (!res.ok) throw new Error('Gagal memuat daftar leads')
      const data = await res.json()
      setLeads(data)
    } catch {
      setError('Terjadi kesalahan saat memuat data prospek/leads.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLeads()
  }, [fetchLeads])

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      setUpdatingId(id)
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: newStatus as any } : l))
      )
    } catch {
      alert('Gagal memperbarui status lead')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleSaveNotes(id: string) {
    try {
      setUpdatingId(id)
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft.trim() || null }),
      })
      if (!res.ok) throw new Error()
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, notes: notesDraft.trim() || null } : l))
      )
      setEditingNotesId(null)
    } catch {
      alert('Gagal menyimpan catatan lead')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = useMemo(() => {
    let rows = leads
    if (statusFilter) rows = rows.filter((l) => l.status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.companyName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.phone && l.phone.toLowerCase().includes(q))
      )
    }
    return rows
  }, [leads, statusFilter, search])

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
            Pipeline Prospek &amp; Registrasi Guest (Leads)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola calon klien yang mendaftar melalui form Guest Demo (PRD §A5 &amp; §C1 #4).
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLeads}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Toolbar filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari prospek atau PT..."
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { key: '', label: 'Semua' },
            { key: 'NEW', label: 'Baru' },
            { key: 'TRIAL_ACTIVE', label: 'Trial Aktif' },
            { key: 'CONVERTED', label: 'Converted' },
            { key: 'COLD', label: 'Cold' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Nama Prospek</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Perusahaan</th>
                <th className="py-3 px-4">Aktivitas Demo</th>
                <th className="py-3 px-4">Status Pipeline</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Memuat data prospek...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada data prospek yang sesuai filter.
                  </td>
                </tr>
              )}

              {filtered.map((lead) => {
                const cfg = LEAD_STATUS_CONFIG[lead.status] ?? LEAD_STATUS_CONFIG.NEW
                const isEditingNotes = editingNotesId === lead.id

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Nama */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {lead.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Daftar: {formatDate(lead.createdAt)}
                      </p>
                    </td>

                    {/* Kontak */}
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Perusahaan */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                        <Building size={12} className="text-slate-400 shrink-0" />
                        <span>{lead.companyName}</span>
                      </div>
                    </td>

                    {/* Login Count & Demo Activity */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Sparkles size={11} className="text-amber-500" />
                          {lead.loginCount} kali login
                        </span>
                        {lead.lastLoginAt && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            Terakhir: {formatDate(lead.lastLoginAt)}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status Pipeline */}
                    <td className="py-3.5 px-4">
                      <select
                        value={lead.status}
                        disabled={updatingId === lead.id}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`h-7 rounded-md px-2 text-[11px] font-bold border border-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${cfg.className}`}
                      >
                        <option value="NEW">New Lead</option>
                        <option value="TRIAL_ACTIVE">Trial Active</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="COLD">Cold Lead</option>
                      </select>
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4 min-w-[200px]">
                      {isEditingNotes ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            placeholder="Tulis catatan..."
                            className="h-7 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(lead.id)}
                            className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
                            title="Simpan"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            title="Batal"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1 group">
                          <p className="text-slate-600 dark:text-slate-300 line-clamp-2 italic text-[11px]">
                            {lead.notes ? `"${lead.notes}"` : <span className="text-slate-400 not-italic">— Belum ada catatan</span>}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotesId(lead.id)
                              setNotesDraft(lead.notes ?? '')
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Edit Catatan"
                          >
                            <FileEdit size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
