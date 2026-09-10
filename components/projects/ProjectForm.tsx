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
import type { Role } from '@/lib/generated/prisma/client'

// Core fields saja — client list/detail menambah field agregasi (taskCount dll)
// yang tidak relevan untuk edit project. Structurally compatible baik dengan
// Project dari ProjectsClient maupun literal di ProjectDetailClient.
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
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectFormProject | null
  role: Role
  onSuccess: () => void
}) {
  const mode: 'create' | 'edit' = project ? 'edit' : 'create'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<PickUser[]>([])
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([])
  const [picIds, setPicIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setName(project?.name ?? '')
    setDescription(project?.description ?? '')
    setStartDate(toDateInput(project?.startDate))
    setEndDate(toDateInput(project?.endDate))
    setCompanyId(project?.companyId ?? '')
    setPicIds([])
  }, [open, project])

  // Daftar PIC hanya dibutuhkan saat create — task starter dibuat sekali.
  // Endpoint /api/users & /api/divisions sudah discope RBAC di server.
  useEffect(() => {
    if (!open || mode !== 'create') return
    Promise.all([
      fetch('/api/users').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/divisions').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([u, d]: [PickUser[], { id: string; name: string }[]]) => {
        setUsers(Array.isArray(u) ? u : [])
        setDivisions(Array.isArray(d) ? d : [])
      })
      .catch(() => {
        setUsers([])
        setDivisions([])
      })
  }, [open, mode])

  // SUPER_ADMIN wajib pilih companyId saat create — lintas tenant.
  useEffect(() => {
    if (!open || role !== 'SUPER_ADMIN' || mode !== 'create') return
    fetch('/api/companies')
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => setCompanies([]))
  }, [open, role, mode])

  const divisionName = (id: string | null) =>
    divisions.find((d) => d.id === id)?.name ?? 'Tanpa divisi'

  // Hanya anggota aktif yang punya divisi — Task.divisionId wajib di schema.
  const assignable = users.filter((u) => u.status === 'ACTIVE' && u.divisionId)

  const selectedDivisionNames = [
    ...new Set(
      picIds.map((id) => divisionName(users.find((u) => u.id === id)?.divisionId ?? null))
    ),
  ]

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama wajib diisi')
      return
    }
    if (role === 'SUPER_ADMIN' && mode === 'create' && !companyId) {
      setError('Company wajib dipilih')
      return
    }
    setError('')
    setLoading(true)

    const url = mode === 'create' ? '/api/projects' : `/api/projects/${project!.id}`
    const method = mode === 'create' ? 'POST' : 'PUT'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || null,
        startDate: startDate || null,
        endDate: endDate || null,
        ...(role === 'SUPER_ADMIN' && mode === 'create' ? { companyId } : {}),
        ...(mode === 'create' && picIds.length > 0 ? { picIds } : {}),
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Gagal menyimpan project')
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-50">
            {mode === 'create' ? 'Buat Project Baru' : 'Edit Project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">Nama Inisiatif</Label>
            <Input
              id="name"
              placeholder="Contoh: Kampanye Peluncuran Q3, Efisiensi SOP Gudang..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Deskripsi / Sasaran Utama</Label>
            <Input
              id="description"
              placeholder="Jelaskan tujuan dan dampak inisiatif ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {role === 'SUPER_ADMIN' && mode === 'create' && (
            <div className="space-y-1.5">
              <Label htmlFor="companyId" className="text-slate-700 dark:text-slate-300">Company</Label>
              <select
                id="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pilih company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300">
                PIC yang Ditugaskan{' '}
                <span className="font-normal text-slate-400">(boleh lintas divisi)</span>
              </Label>
              <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                {assignable.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-slate-400">
                    Belum ada anggota aktif yang bisa ditugaskan.
                  </p>
                ) : (
                  assignable.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <input
                        type="checkbox"
                        checked={picIds.includes(u.id)}
                        onChange={() =>
                          setPicIds((prev) =>
                            prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                        {u.name}
                      </span>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {divisionName(u.divisionId)}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-400">
                {picIds.length === 0
                  ? 'Tanpa PIC, project dibuat kosong dan task bisa ditambah nanti.'
                  : `Divisi terlibat: ${selectedDivisionNames.join(' · ')}`}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-slate-700 dark:text-slate-300">Tanggal Mulai</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-slate-700 dark:text-slate-300">Target Selesai</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
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
