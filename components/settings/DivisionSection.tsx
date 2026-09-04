'use client'

import { useEffect, useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DivisionFormModal } from '@/components/settings/DivisionFormModal'
import type { Company } from '@/components/settings/CompanySection'

export interface Division {
  id: string
  name: string
  description: string | null
  companyId: string
}

export function DivisionSection({ role, companyId }: { role: Role; companyId: string | null }) {
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  const [data, setData] = useState<Division[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Division | null>(null)
  const [deleting, setDeleting] = useState<Division | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies()
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchCompanies() {
    try {
      const res = await fetch('/api/companies')
      if (!res.ok) throw new Error()
      const list: Company[] = await res.json()
      setCompanies(list)
      if (list.length > 0) setSelectedCompanyId(list[0].id)
    } catch {
      // biarkan selector kosong, tabel tetap bisa dicoba lagi via retry
    }
  }

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/divisions')
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
      const res = await fetch(`/api/divisions/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeleting(null)
      fetchData()
    } catch {
      setError('Gagal menghapus divisi')
    } finally {
      setDeleteLoading(false)
    }
  }

  const rows = isSuperAdmin ? (data ?? []).filter((d) => d.companyId === selectedCompanyId) : data ?? []

  if (loading) return <div className="text-sm text-slate-500">Memuat...</div>

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <p className="text-sm text-slate-700">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {isSuperAdmin ? (
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Divisi Baru
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 p-5">Belum ada divisi</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">Deskripsi</th>
                <th className="px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 text-slate-800">{d.name}</td>
                  <td className="px-5 py-3 text-slate-600">{d.description || '-'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(d)
                          setFormOpen(true)
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(d)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DivisionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        role={role}
        division={editing}
        companies={companies}
        defaultCompanyId={selectedCompanyId || companyId}
        onSuccess={() => {
          setFormOpen(false)
          fetchData()
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus Divisi"
        message={`Yakin ingin menghapus "${deleting?.name}"?`}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  )
}
