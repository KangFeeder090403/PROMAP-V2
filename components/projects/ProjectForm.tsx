'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RotateCcw, X } from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'

export type ProjectFormProject = {
  id: string
  name: string
  description: string | null
  companyId: string
  divisionId: string | null
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
}

type PickUser = {
  id: string
  name: string
  role: Role
  status: string
  companyId: string | null
  divisionId: string | null
}

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function ProjectForm({
  open,
  onOpenChange,
  project,
  role,
  currentUserDivisionId = null,
  prefill,
  submitTo,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectFormProject | null
  role: Role
  /** Divisi user aktif — dipakai membatasi picker PIC untuk MANAGER. */
  currentUserDivisionId?: string | null
  /** Nilai awal saat create dari sumber lain, mis. konversi Proposal. */
  prefill?: { name: string; description: string | null }
  /** Endpoint alternatif khusus mode create (konversi Proposal). */
  submitTo?: { url: string; extra?: Record<string, unknown> }
  onSuccess: (project?: { id: string; name: string }) => void
}) {
  const mode: 'create' | 'edit' = project ? 'edit' : 'create'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [divisionId, setDivisionId] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean>(true)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<PickUser[]>([])
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([])
  const [picIds, setPicIds] = useState<string[]>([])
  const [originalPicIds, setOriginalPicIds] = useState<string[]>([])
  const [picSearch, setPicSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [picLoading, setPicLoading] = useState(true)
  const [picError, setPicError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open) return
    setError('')
    setName(project?.name ?? prefill?.name ?? '')
    setDescription(project?.description ?? prefill?.description ?? '')
    setStartDate(toDateInput(project?.startDate))
    setEndDate(toDateInput(project?.endDate))
    setCompanyId(project?.companyId ?? '')
    setDivisionId(project?.divisionId ?? '')
    setIsActive(project?.isActive ?? true)
    setPicSearch('')

    if (mode === 'create') {
      setPicIds([])
      setOriginalPicIds([])
    }
  }, [open, project, mode])

  // Muat data anggota aktif dan divisi saat modal dibuka
  useEffect(() => {
    if (!open) return
    let active = true
    setPicLoading(true)
    setPicError(false)
    Promise.all([
      fetch('/api/users').then((r) => {
        if (!r.ok) throw new Error('users')
        return r.json()
      }),
      fetch('/api/divisions').then((r) => {
        if (!r.ok) throw new Error('divisions')
        return r.json()
      }),
    ])
      .then(([u, d]: [PickUser[], { id: string; name: string }[]]) => {
        if (!active) return
        setUsers(Array.isArray(u) ? u : [])
        setDivisions(Array.isArray(d) ? d : [])
      })
      .catch(() => {
        if (!active) return
        setUsers([])
        setDivisions([])
        setPicError(true)
      })
      .finally(() => {
        if (active) setPicLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, reloadKey])

  // Saat edit, ambil daftar PIC yang saat ini terdaftar di task project
  useEffect(() => {
    if (!open || mode !== 'edit' || !project) return
    fetch(`/api/projects/${project.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tasks) {
          const ids = (data.tasks as { picId?: string; pic?: { id: string } }[])
            .map((t) => t.picId || t.pic?.id)
            .filter((id: unknown): id is string => typeof id === 'string')
          const uniqueIds = [...new Set(ids)]
          setPicIds(uniqueIds)
          setOriginalPicIds(uniqueIds)
        }
      })
      .catch(() => {})
  }, [open, mode, project?.id])

  // SUPER_ADMIN wajib pilih companyId saat create lintas tenant
  useEffect(() => {
    if (!open || role !== 'SUPER_ADMIN' || mode !== 'create') return
    fetch('/api/companies')
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => setCompanies([]))
  }, [open, role, mode])

  const divisionName = (id: string | null) =>
    divisions.find((d) => d.id === id)?.name ?? 'Tanpa divisi'

  // Hanya anggota aktif yang punya divisi, dan yang memang boleh ditugaskan server:
  // SUPER_ADMIN dibatasi company terpilih, MANAGER dibatasi divisinya sendiri.
  // Tanpa filter ini picker menawarkan orang yang pasti ditolak server (400/403).
  const scopeCompanyId = role === 'SUPER_ADMIN' ? companyId : null
  const assignable = users.filter(
    (u) =>
      u.status === 'ACTIVE' &&
      u.divisionId &&
      (role !== 'SUPER_ADMIN' || !scopeCompanyId || u.companyId === scopeCompanyId) &&
      (role !== 'MANAGER' || u.divisionId === currentUserDivisionId)
  )
  const needCompanyFirst = role === 'SUPER_ADMIN' && mode === 'create' && !companyId

  const filteredAssignable = assignable.filter((u) => {
    if (!picSearch.trim()) return true
    const q = picSearch.toLowerCase()
    const div = divisionName(u.divisionId).toLowerCase()
    return u.name.toLowerCase().includes(q) || div.includes(q)
  })

  const selectedDivisionNames = [
    ...new Set(
      picIds.map((id) => divisionName(users.find((u) => u.id === id)?.divisionId ?? null))
    ),
  ]

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama Inisiatif wajib diisi')
      return
    }
    if (role === 'SUPER_ADMIN' && mode === 'create' && !companyId) {
      setError('Company wajib dipilih')
      return
    }
    setError('')
    setLoading(true)

    // submitTo hanya berlaku untuk create — mode edit tetap PUT ke project-nya sendiri.
    const url =
      mode === 'create'
        ? (submitTo?.url ?? '/api/projects')
        : `/api/projects/${project!.id}`
    const method = mode === 'create' ? 'POST' : 'PUT'

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      startDate: startDate || null,
      endDate: endDate || null,
      picIds,
      ...(mode === 'create' ? submitTo?.extra : undefined),
    }

    if (mode === 'edit') {
      payload.isActive = isActive
    }

    if (role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL') {
      payload.divisionId = divisionId || null
    }

    if (role === 'SUPER_ADMIN' && mode === 'create') {
      payload.companyId = companyId
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error || 'Gagal menyimpan project')
      return
    }

    // POST /api/projects membalas project telanjang, konversi proposal membalas
    // { success, project } — satu baris ini menyamakan keduanya.
    onSuccess(data.project ?? data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-50">
            {mode === 'create' ? 'Buat Project Baru' : 'Edit Project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-1" noValidate>
          {/* 1. Nama Inisiatif */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
              Nama Inisiatif <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Contoh: Kampanye Peluncuran Q3, Efisiensi SOP Gudang..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          {/* 2. Divisi / Scope Inisiatif (SUPER_ADMIN & ADMIN_OPERATIONAL) */}
          {(role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL') && (
            <div className="space-y-1.5">
              <Label htmlFor="divisionId" className="text-slate-700 dark:text-slate-300">
                Divisi / Lingkup Inisiatif
              </Label>
              <select
                id="divisionId"
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Divisi (Lintas Divisi)</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                Pilih divisi spesifik atau biarkan kosong jika inisiatif bersifat lintas divisi.
              </p>
            </div>
          )}

          {/* 3. Status Inisiatif (Hanya saat Edit) */}
          {mode === 'edit' && (
            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300">Status Inisiatif</Label>
              <div className="flex items-center gap-4 pt-1">
                <label htmlFor="project-status-active" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    id="project-status-active"
                    type="radio"
                    name="isActive"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Aktif (Sedang Berjalan)</span>
                  </span>
                </label>
                <label htmlFor="project-status-archived" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    id="project-status-archived"
                    type="radio"
                    name="isActive"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Diarsipkan / Nonaktif</span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 4. Deskripsi / Sasaran Utama */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">
              Deskripsi &amp; Sasaran Utama
            </Label>
            <textarea
              id="description"
              rows={3}
              placeholder="Jelaskan tujuan strategis, KPI, dan dampak yang diharapkan dari inisiatif ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>

          {/* 5. Company (Khusus SUPER_ADMIN saat Create) */}
          {role === 'SUPER_ADMIN' && mode === 'create' && (
            <div className="space-y-1.5">
              <Label htmlFor="companyId" className="text-slate-700 dark:text-slate-300">
                Company <span className="text-red-500">*</span>
              </Label>
              <select
                id="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pilih company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 6. Timeline (Tanggal Mulai & Target Selesai) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-slate-700 dark:text-slate-300">
                Tanggal Mulai
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-slate-700 dark:text-slate-300">
                Target Selesai
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          {/* 7. PIC yang Ditugaskan (Kelola Anggota / Task Starter) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-slate-700 dark:text-slate-300">
                PIC yang Ditugaskan{' '}
                <span className="font-normal text-slate-400">(boleh lintas divisi)</span>
              </Label>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {picIds.length} PIC terpilih
              </span>
            </div>

            {assignable.length > 5 && (
              <Input
                placeholder="Cari nama anggota atau divisi..."
                value={picSearch}
                onChange={(e) => setPicSearch(e.target.value)}
                className="h-8 text-xs dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
              />
            )}

            <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
              {picLoading ? (
                <div className="space-y-2 p-3" aria-busy="true" aria-live="polite">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      <div className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      <div className="h-3 w-20 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : picError ? (
                <div className="flex flex-col items-center gap-2 px-3 py-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    Gagal memuat daftar anggota.
                  </p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Coba lagi
                  </button>
                </div>
              ) : needCompanyFirst ? (
                <p className="px-3 py-3 text-xs text-slate-400 text-center">
                  Pilih perusahaan dulu untuk melihat anggota yang bisa ditugaskan.
                </p>
              ) : filteredAssignable.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-3 py-4">
                  <p className="text-xs text-slate-400 text-center">
                    {picSearch ? 'Tidak ada anggota yang cocok.' : 'Belum ada anggota aktif.'}
                  </p>
                  {picSearch && (
                    <button
                      type="button"
                      onClick={() => setPicSearch('')}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Reset pencarian
                    </button>
                  )}
                </div>
              ) : (
                filteredAssignable.map((u) => {
                  const isChecked = picIds.includes(u.id)
                  const isOriginal = originalPicIds.includes(u.id)

                  return (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setPicIds((prev) =>
                            prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      />
                      <span className="flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                        {u.name}
                      </span>
                      {mode === 'edit' && isOriginal && isChecked && (
                        <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-300">
                          PIC Saat Ini
                        </span>
                      )}
                      {mode === 'edit' && !isOriginal && isChecked && (
                        <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
                          + Baru
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {divisionName(u.divisionId)}
                      </span>
                    </label>
                  )
                })
              )}
            </div>

            <p className="text-xs text-slate-400">
              {mode === 'create'
                ? picIds.length === 0
                  ? 'Tanpa PIC, project dibuat kosong dan task bisa ditambah nanti.'
                  : `Divisi terlibat: ${selectedDivisionNames.join(' · ')}`
                : 'PIC yang baru dicentang akan otomatis dibuatkan task starter. Menghapus centang PIC akan menghapus task terkait jika belum memiliki Action Plan.'}
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
