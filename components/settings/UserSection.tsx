'use client'

import { useEffect, useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { UserFormModal } from '@/components/settings/UserFormModal'
import { UserApproveDialog } from '@/components/settings/UserApproveDialog'
import type { Company } from '@/components/settings/CompanySection'
import type { Division } from '@/components/settings/DivisionSection'
import type { UserLabel } from '@/components/settings/UserLabelSection'

export interface ManagedUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: Role
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE'
  companyId: string | null
  divisionId: string | null
  supervisorId: string | null
  userLabelId: string | null
  isGuest: boolean
}

const STATUS_STYLE: Record<ManagedUser['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
}

const STATUS_LABEL: Record<ManagedUser['status'], string> = {
  PENDING: 'Menunggu',
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif',
}

export function UserSection({ role, companyId }: { role: Role; companyId: string | null }) {
  const canManage = role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONAL'
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const [companies, setCompanies] = useState<Company[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [userLabels, setUserLabels] = useState<UserLabel[]>([])
  const [data, setData] = useState<ManagedUser[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [approveTarget, setApproveTarget] = useState<ManagedUser | null>(null)
  const [approveAction, setApproveAction] = useState<'approve' | 'reject' | null>(null)
  const [approveLoading, setApproveLoading] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies()
    fetchDivisions()
    fetchUserLabels()
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

  async function fetchDivisions() {
    try {
      const res = await fetch('/api/divisions')
      if (!res.ok) throw new Error()
      setDivisions(await res.json())
    } catch {
      // biarkan kosong, kolom Divisi tampil '-'
    }
  }

  async function fetchUserLabels() {
    try {
      const res = await fetch('/api/user-labels')
      if (!res.ok) throw new Error()
      setUserLabels(await res.json())
    } catch {
      // biarkan kosong, kolom Label tampil '-'
    }
  }

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Gagal memuat data')
      setData(await res.json())
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!approveTarget || !approveAction) return
    setApproveLoading(true)
    try {
      const res = await fetch(`/api/users/${approveTarget.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: approveAction }),
      })
      if (!res.ok) throw new Error()
      setApproveTarget(null)
      setApproveAction(null)
      fetchData()
    } catch {
      setError('Gagal memproses user')
    } finally {
      setApproveLoading(false)
    }
  }

  function divisionName(id: string | null) {
    return divisions.find((d) => d.id === id)?.name ?? '-'
  }

  function labelName(id: string | null) {
    return userLabels.find((l) => l.id === id)?.name ?? '-'
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {canManage && (
          <div className="flex justify-end">
            <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          </div>
        )}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="h-10 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center px-5 gap-6">
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4 animate-pulse">
                <div className="h-4 w-1/5 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3.5 w-1/4 bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
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
      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            User Baru
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {data.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 p-5">Belum ada user</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Divisi</th>
                  <th className="px-5 py-3">Label</th>
                  {canManage && <th className="px-5 py-3">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="px-5 py-3 text-slate-800 dark:text-slate-100 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{u.role}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[u.status]}`}
                      >
                        {STATUS_LABEL[u.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{divisionName(u.divisionId)}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{labelName(u.userLabelId)}</td>
                    {canManage && (
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(u)
                              setFormOpen(true)
                            }}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            Edit
                          </button>
                          {u.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setApproveTarget(u)
                                  setApproveAction('approve')
                                }}
                                className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setApproveTarget(u)
                                  setApproveAction('reject')
                                }}
                                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              >
                                Tolak
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <>
          <UserFormModal
            open={formOpen}
            onOpenChange={setFormOpen}
            role={role}
            user={editing}
            companies={companies}
            divisions={divisions}
            userLabels={userLabels}
            users={data}
            defaultCompanyId={companyId}
            onSuccess={() => {
              setFormOpen(false)
              fetchData()
            }}
          />

          <UserApproveDialog
            open={!!approveTarget}
            onOpenChange={(open) => {
              if (!open) {
                setApproveTarget(null)
                setApproveAction(null)
              }
            }}
            userName={approveTarget?.name}
            action={approveAction}
            onConfirm={handleApprove}
            loading={approveLoading}
          />
        </>
      )}
    </div>
  )
}
