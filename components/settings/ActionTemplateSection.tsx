'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  LayoutTemplate,
  ChevronDown,
} from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'

interface Division {
  id: string
  name: string
  companyId: string
}

interface ActionTemplate {
  id: string
  title: string
  description: string | null
  divisionId: string
  division: Division
  createdAt: string
}

interface FormState {
  title: string
  description: string
  divisionId: string
}

const EMPTY_FORM: FormState = { title: '', description: '', divisionId: '' }

export function ActionTemplateSection({
  role,
  divisionId: userDivisionId,
}: {
  role: Role
  divisionId: string | null
}) {
  const [templates, setTemplates] = useState<ActionTemplate[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form tambah
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Edit inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ title: string; description: string }>({
    title: '',
    description: '',
  })
  const [editSaving, setEditSaving] = useState(false)

  // Filter by division
  const [filterDivisionId, setFilterDivisionId] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [tRes, dRes] = await Promise.all([
        fetch('/api/action-templates'),
        fetch('/api/divisions'),
      ])
      if (!tRes.ok) throw new Error('Gagal memuat template')
      const [tData, dData] = await Promise.all([tRes.json(), dRes.ok ? dRes.json() : []])
      setTemplates(tData)
      // divisions API mungkin return array langsung atau { divisions: [] }
      setDivisions(Array.isArray(dData) ? dData : (dData.divisions ?? []))
    } catch {
      setError('Terjadi kesalahan saat memuat data template.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Jika MANAGER, default divisionId ke divisi sendiri
  useEffect(() => {
    if (role === 'MANAGER' && userDivisionId) {
      setForm((f) => ({ ...f, divisionId: userDivisionId }))
      setFilterDivisionId(userDivisionId)
    }
  }, [role, userDivisionId])

  async function handleAdd() {
    if (!form.title.trim()) {
      setActionError('Judul template wajib diisi.')
      return
    }
    if (!form.divisionId) {
      setActionError('Pilih divisi terlebih dahulu.')
      return
    }
    try {
      setSaving(true)
      setActionError(null)
      const res = await fetch('/api/action-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Gagal menyimpan')
      }
      const created: ActionTemplate = await res.json()
      setTemplates((prev) => [...prev, created])
      setForm(role === 'MANAGER' && userDivisionId ? { ...EMPTY_FORM, divisionId: userDivisionId } : EMPTY_FORM)
      setShowForm(false)
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Gagal menyimpan template.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(t: ActionTemplate) {
    setEditingId(t.id)
    setEditForm({ title: t.title, description: t.description ?? '' })
  }

  async function handleEdit(id: string) {
    if (!editForm.title.trim()) {
      setActionError('Judul template wajib diisi.')
      return
    }
    try {
      setEditSaving(true)
      setActionError(null)
      const res = await fetch(`/api/action-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      const updated: ActionTemplate = await res.json()
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)))
      setEditingId(null)
    } catch {
      setActionError('Gagal menyimpan perubahan.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Hapus template "${title}"?`)) return
    try {
      setActionError(null)
      const res = await fetch(`/api/action-templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setActionError('Gagal menghapus template.')
    }
  }

  const filtered = filterDivisionId
    ? templates.filter((t) => t.divisionId === filterDivisionId)
    : templates

  // Group by division untuk tampilan
  const grouped = filtered.reduce<Record<string, ActionTemplate[]>>((acc, t) => {
    const key = t.division.name
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold ml-2 cursor-pointer">×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LayoutTemplate size={18} className="text-blue-600 dark:text-blue-400" />
            Katalog Template Aksi per Divisi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Template action plan standar yang bisa dipakai ulang oleh tiap divisi.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(true); setActionError(null) }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus size={13} />
            Tambah Template
          </button>
        </div>
      </div>

      {/* Form Tambah */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Template Baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Judul Template <span className="text-red-500">*</span>
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Contoh: Evaluasi Bulanan"
                className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Divisi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.divisionId}
                  onChange={(e) => setForm((f) => ({ ...f, divisionId: e.target.value }))}
                  disabled={role === 'MANAGER'}
                  className="w-full h-8 pl-3 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-60 cursor-pointer"
                >
                  <option value="">— Pilih Divisi —</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Deskripsi <span className="text-slate-400 font-normal normal-case">(opsional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Jelaskan singkat tujuan template ini..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setActionError(null) }}
              className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Template'}
            </button>
          </div>
        </div>
      )}

      {/* Filter divisi (hanya untuk non-MANAGER) */}
      {role !== 'MANAGER' && divisions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filter divisi:</span>
          <div className="relative">
            <select
              value={filterDivisionId}
              onChange={(e) => setFilterDivisionId(e.target.value)}
              className="h-7 pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="">Semua Divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Daftar template grouped by divisi */}
      {loading && templates.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-blue-500" />
          Memuat template...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <LayoutTemplate size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada template</p>
          <p className="text-xs text-slate-400 mt-1">Klik "Tambah Template" untuk mulai membuat katalog.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([divName, items]) => (
            <div key={divName} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {divName}
                </span>
                <span className="ml-2 text-[10px] text-slate-400">({items.length} template)</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((t) => (
                  <div key={t.id} className="px-4 py-3">
                    {editingId === t.id ? (
                      <div className="space-y-2">
                        <input
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleEdit(t.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                        />
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Deskripsi (opsional)"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleEdit(t.id)}
                            disabled={editSaving}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                          >
                            <Save size={11} />
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <X size={11} />
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3 group">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                            {t.title}
                          </p>
                          {t.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEdit(t)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(t.id, t.title)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
