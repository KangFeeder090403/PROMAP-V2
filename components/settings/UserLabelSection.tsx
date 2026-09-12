'use client'

import { useEffect, useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { UserLabelFormModal } from '@/components/settings/UserLabelFormModal'
import type { Company } from '@/components/settings/CompanySection'

export interface UserLabel {
  id: string
  name: string
  companyId: string
  status: 'PENDING' | 'ACTIVE' | 'REJECTED'
}

const STATUS_STYLE: Record<UserLabel['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<UserLabel['status'], string> = {
  PENDING: 'Menunggu',
  ACTIVE: 'Aktif',
  REJECTED: 'Ditolak',
}

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

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies()
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchCompanies() {
    try {
      const res = await fetch('/api/companies')
      if (!res.ok) throw new Error()
      setCompanies(await res.json())
    } catch {
      // biarkan dropdown kosong
    }
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

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="h-10 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center px-5 gap-6">
            <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4 animate-pulse">
                <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
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

  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          {role === 'MANAGER' ? 'Usulkan Label Baru' : 'Label Baru'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {data.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 p-5">Belum ada label jabatan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-5 py-3 text-slate-800 dark:text-slate-100 font-medium">{l.name}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[l.status]}`}
                      >
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {canManage && l.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoadingId === l.id}
                              onClick={() => handleApprove(l.id, 'approve')}
                              className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === l.id}
                              onClick={() => handleApprove(l.id, 'reject')}
                              className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setDeleting(l)}
                            className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Hapus
                          </button>
                        )}
                        {!canManage && l.status !== 'PENDING' && (
                          <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserLabelFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        role={role}
        companies={companies}
        defaultCompanyId={companyId}
        onSuccess={() => {
          setFormOpen(false)
          fetchData()
        }}
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
