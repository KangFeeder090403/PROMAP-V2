'use client'

import { useEffect, useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CompanyFormModal } from '@/components/settings/CompanyFormModal'

export interface Company {
  id: string
  name: string
  uniqueCode: string
  logoUrl: string | null
  subscription: 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  isActive: boolean
}

const SUBSCRIPTION_STYLE: Record<Company['subscription'], string> = {
  BASIC: 'bg-slate-100 text-slate-600',
  PREMIUM: 'bg-blue-100 text-blue-700',
  ENTERPRISE: 'bg-indigo-100 text-indigo-700',
}

export function CompanySection({ role }: { role: Role }) {
  const [data, setData] = useState<Company[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/companies')
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
      const res = await fetch(`/api/companies/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeleting(null)
      fetchData()
    } catch {
      setError('Gagal menghapus perusahaan')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="h-10 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center px-5 gap-6">
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4 animate-pulse">
                <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
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
        {role === 'SUPER_ADMIN' && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            Perusahaan Baru
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {data.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 p-5">Belum ada perusahaan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Kode Unik</th>
                  <th className="px-5 py-3">Subscription</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-5 py-3 text-slate-800 dark:text-slate-100">{c.name}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">{c.uniqueCode}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SUBSCRIPTION_STYLE[c.subscription]}`}
                      >
                        {c.subscription}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(c)
                            setFormOpen(true)
                          }}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        {role === 'SUPER_ADMIN' && (
                          <button
                            type="button"
                            onClick={() => setDeleting(c)}
                            className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Hapus
                          </button>
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

      <CompanyFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        role={role}
        company={editing}
        onSuccess={() => {
          setFormOpen(false)
          fetchData()
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus Perusahaan"
        message={`Yakin ingin menghapus "${deleting?.name}"? Semua divisi, user, dan project terkait akan ikut dinonaktifkan.`}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  )
}
