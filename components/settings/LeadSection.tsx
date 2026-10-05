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
  SlidersHorizontal,
} from 'lucide-react'
import { FilterPopover } from '@/components/ui/FilterPopover'
import { ActiveChip } from '@/components/ui/FilterToolbar'

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
  industri: string | null
  omzet: string | null
  teamSize: number | null
  createdAt: string
}

const LEAD_STATUS_CONFIG = {
  NEW: {
    label: 'Lead Baru',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  TRIAL_ACTIVE: {
    label: 'Trial Aktif',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  CONVERTED: {
    label: 'Menjadi Klien',
    className: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  },
  COLD: {
    label: 'Tidak Aktif',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
  },
}

const LEAD_STATUS_OPTIONS = [
  { value: 'NEW', label: 'Lead Baru' },
  { value: 'TRIAL_ACTIVE', label: 'Trial Aktif' },
  { value: 'CONVERTED', label: 'Menjadi Klien' },
  { value: 'COLD', label: 'Tidak Aktif' },
]

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
  const [actionError, setActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState<string>('')
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'industri' | 'omzet' | 'teamSize' | null>(null)
  const [fieldDraft, setFieldDraft] = useState<string>('')
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
      setActionError(null)
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
      setActionError('Gagal memperbarui status prospek. Coba lagi.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleSaveNotes(id: string) {
    try {
      setUpdatingId(id)
      setActionError(null)
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
      setActionError('Gagal menyimpan catatan prospek. Coba lagi.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleSaveField(id: string, field: 'industri' | 'omzet' | 'teamSize') {
    try {
      setUpdatingId(id)
      setActionError(null)
      const value = fieldDraft.trim() || null
      const body: Record<string, string | number | null> =
        field === 'teamSize'
          ? { teamSize: value !== null ? parseInt(value, 10) || null : null }
          : { [field]: value }
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, [field]: field === 'teamSize' ? (value !== null ? parseInt(value, 10) || null : null) : value }
            : l
        )
      )
      setEditingFieldId(null)
      setEditingField(null)
    } catch {
      setActionError('Gagal menyimpan data. Coba lagi.')
    } finally {
      setUpdatingId(null)
    }
  }

  function startEditField(id: string, field: 'industri' | 'omzet' | 'teamSize', current: string | number | null) {
    setEditingFieldId(id)
    setEditingField(field)
    setFieldDraft(current !== null ? String(current) : '')
  }

  function cancelEditField() {
    setEditingFieldId(null)
    setEditingField(null)
    setFieldDraft('')
  }

  const filtered = useMemo(() => {
    let rows = leads
    if (statusFilters.length > 0) {
      rows = rows.filter((l) => statusFilters.includes(l.status))
    }
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
  }, [leads, statusFilters, search])

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold ml-2">×</button>
        </div>
      )}

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
      <div className="flex flex-col gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari prospek atau PT..."
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Hapus pencarian"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  filterOpen || statusFilters.length > 0
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                <span>Filter</span>
                {statusFilters.length > 0 && (
                  <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white text-blue-700 px-1 text-[10px] font-bold">
                    {statusFilters.length}
                  </span>
                )}
              </button>

              <FilterPopover
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                onApply={(draft) => {
                  setStatusFilters(draft.statuses)
                }}
                initialValues={{
                  statuses: statusFilters,
                }}
                config={{
                  statuses: LEAD_STATUS_OPTIONS,
                  priorities: false,
                  divisions: false,
                  pics: false,
                  projects: false,
                  dateRange: false,
                  entityName: 'Prospek',
                  totalEntities: leads.length,
                }}
                totalResults={filtered.length}
              />
            </div>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{filtered.length}</span> dari {leads.length} prospek
          </span>
        </div>

        {/* Active Chips Row */}
        {statusFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 shrink-0">
              STATUS AKTIF:
            </span>
            {statusFilters.map((st) => (
              <ActiveChip
                key={st}
                label={LEAD_STATUS_CONFIG[st as keyof typeof LEAD_STATUS_CONFIG]?.label ?? st}
                onRemove={() => setStatusFilters((prev) => prev.filter((s) => s !== st))}
              />
            ))}
            <button
              type="button"
              onClick={() => setStatusFilters([])}
              className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
            >
              Hapus filter
            </button>
          </div>
        )}
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
                <th className="py-3 px-4">Nama</th>
                <th className="py-3 px-4">Telepon</th>
                <th className="py-3 px-4">Perusahaan</th>
                <th className="py-3 px-4">Industri Bergerak</th>
                <th className="py-3 px-4">Omzet</th>
                <th className="py-3 px-4">Tim</th>
                <th className="py-3 px-4">Aktivitas Demo</th>
                <th className="py-3 px-4">Status Pipeline</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && leads.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Memuat data prospek...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {search || statusFilters.length > 0
                        ? 'Tidak ada data prospek yang sesuai dengan pencarian dan filter.'
                        : 'Belum ada data prospek.'}
                    </p>
                    {(search || statusFilters.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('')
                          setStatusFilters([])
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Reset Filter &amp; Pencarian
                      </button>
                    )}
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

                    {/* Telepon */}
                    <td className="py-3.5 px-4">
                      {lead.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Perusahaan */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                        <Building size={12} className="text-slate-400 shrink-0" />
                        <span>{lead.companyName}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                        <Mail size={10} className="text-slate-400 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    </td>

                    {/* Industri */}
                    <td className="py-3.5 px-4 min-w-[140px]">
                      {editingFieldId === lead.id && editingField === 'industri' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={fieldDraft}
                            onChange={(e) => setFieldDraft(e.target.value)}
                            placeholder="Contoh: Kuliner"
                            className="h-7 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleSaveField(lead.id, 'industri')
                              if (e.key === 'Escape') cancelEditField()
                            }}
                            autoFocus
                          />
                          <button type="button" onClick={() => void handleSaveField(lead.id, 'industri')} className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white" title="Simpan"><Save size={12} /></button>
                          <button type="button" onClick={cancelEditField} className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" title="Batal"><X size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1 group">
                          <span className={lead.industri ? 'text-slate-700 dark:text-slate-200 text-xs' : 'text-slate-400 text-[11px] italic'}>
                            {lead.industri ?? '— Belum diisi'}
                          </span>
                          <button type="button" onClick={() => startEditField(lead.id, 'industri', lead.industri)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Edit"><FileEdit size={12} /></button>
                        </div>
                      )}
                    </td>

                    {/* Omzet */}
                    <td className="py-3.5 px-4 min-w-[130px]">
                      {editingFieldId === lead.id && editingField === 'omzet' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={fieldDraft}
                            onChange={(e) => setFieldDraft(e.target.value)}
                            placeholder="Contoh: 50 jt/bln"
                            className="h-7 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleSaveField(lead.id, 'omzet')
                              if (e.key === 'Escape') cancelEditField()
                            }}
                            autoFocus
                          />
                          <button type="button" onClick={() => void handleSaveField(lead.id, 'omzet')} className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white" title="Simpan"><Save size={12} /></button>
                          <button type="button" onClick={cancelEditField} className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" title="Batal"><X size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1 group">
                          <span className={lead.omzet ? 'text-slate-700 dark:text-slate-200 text-xs' : 'text-slate-400 text-[11px] italic'}>
                            {lead.omzet ?? '— Belum diisi'}
                          </span>
                          <button type="button" onClick={() => startEditField(lead.id, 'omzet', lead.omzet)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Edit"><FileEdit size={12} /></button>
                        </div>
                      )}
                    </td>

                    {/* Tim */}
                    <td className="py-3.5 px-4 min-w-[100px]">
                      {editingFieldId === lead.id && editingField === 'teamSize' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            value={fieldDraft}
                            onChange={(e) => setFieldDraft(e.target.value)}
                            placeholder="Jml orang"
                            className="h-7 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleSaveField(lead.id, 'teamSize')
                              if (e.key === 'Escape') cancelEditField()
                            }}
                            autoFocus
                          />
                          <button type="button" onClick={() => void handleSaveField(lead.id, 'teamSize')} className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white" title="Simpan"><Save size={12} /></button>
                          <button type="button" onClick={cancelEditField} className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" title="Batal"><X size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1 group">
                          <span className={lead.teamSize !== null ? 'text-slate-700 dark:text-slate-200 text-xs font-semibold' : 'text-slate-400 text-[11px] italic'}>
                            {lead.teamSize !== null ? `${lead.teamSize} orang` : '— Belum diisi'}
                          </span>
                          <button type="button" onClick={() => startEditField(lead.id, 'teamSize', lead.teamSize)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Edit"><FileEdit size={12} /></button>
                        </div>
                      )}
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
