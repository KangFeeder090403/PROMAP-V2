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
import type { Project } from '@/components/projects/ProjectsClient'

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
  project: Project | null
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
  }, [open, project])

  // SUPER_ADMIN wajib pilih companyId saat create — lintas tenant.
  useEffect(() => {
    if (!open || role !== 'SUPER_ADMIN' || mode !== 'create') return
    fetch('/api/companies')
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => setCompanies([]))
  }, [open, role, mode])

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
          <DialogTitle className="text-slate-900">
            {mode === 'create' ? 'Project Baru' : 'Edit Project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700">Nama</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-slate-700">Deskripsi</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {role === 'SUPER_ADMIN' && mode === 'create' && (
            <div className="space-y-1.5">
              <Label htmlFor="companyId" className="text-slate-700">Company</Label>
              <select
                id="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pilih company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-slate-700">Mulai</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-slate-700">Selesai</Label>
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
