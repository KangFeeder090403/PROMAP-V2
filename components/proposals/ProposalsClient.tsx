'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PROPOSAL_STATUS_STYLE, PROPOSAL_STATUS_LABEL } from '@/lib/status-labels'
import { ProposalFormModal } from '@/components/proposals/ProposalFormModal'
import { ProposalReviewDialog } from '@/components/proposals/ProposalReviewDialog'

export interface Proposal {
  id: string
  proposerId: string
  title: string
  description: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_FILTERS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const

export function ProposalsClient({
  role,
  userId,
  openCreate,
}: {
  role: Role
  userId: string
  openCreate?: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState<Proposal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Proposal | null>(null)
  const [deleting, setDeleting] = useState<Proposal | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<Proposal | null>(null)

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  // Header "+ New > Proposal" mengarah ke /proposals?new=1. Buka modal, lalu
  // bersihkan param pakai replace supaya back/refresh tidak membukanya lagi.
  useEffect(() => {
    if (!openCreate) return
    setEditing(null)
    setFormOpen(true)
    // ponytail: pathname literal — cukup selama route ini statis.
    // Kalau /proposals jadi dinamis, ganti ke usePathname().
    router.replace('/proposals', { scroll: false })
  }, [openCreate])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const qs = statusFilter ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/proposals${qs}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      setData(await res.json())
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(proposal: Proposal) {
    setSubmittingId(proposal.id)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      })
      if (!res.ok) throw new Error()
      fetchData()
    } catch {
      setError('Gagal submit proposal')
    } finally {
      setSubmittingId(null)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/proposals/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeleting(null)
      fetchData()
    } catch {
      setError('Gagal menghapus proposal')
    } finally {
      setDeleteLoading(false)
    }
  }

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
      <div className="flex items-center justify-between">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Semua Status</option>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {PROPOSAL_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Buat Proposal
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {data.length === 0 ? (
          <p className="text-sm text-slate-500 p-5">Belum ada proposal</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3">Judul</th>
                <th className="px-5 py-3">Pengaju</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Dibuat</th>
                <th className="px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => {
                const isOwner = p.proposerId === userId
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-800">{p.title}</td>
                    <td className="px-5 py-3 text-slate-600">{isOwner ? 'Anda' : p.proposerId}</td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={p.status}
                        styleMap={PROPOSAL_STATUS_STYLE}
                        labelMap={PROPOSAL_STATUS_LABEL}
                      />
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {isOwner && p.status === 'DRAFT' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(p)
                                setFormOpen(true)
                              }}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubmit(p)}
                              disabled={submittingId === p.id}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                            >
                              {submittingId === p.id ? 'Mengirim...' : 'Submit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(p)}
                              className="text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                        {role === 'MANAGER' && p.status === 'SUBMITTED' && !isOwner && (
                          <button
                            type="button"
                            onClick={() => setReviewing(p)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <ProposalFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        proposal={editing}
        onSuccess={() => {
          setFormOpen(false)
          fetchData()
        }}
      />

      <ProposalReviewDialog
        open={!!reviewing}
        onOpenChange={(open) => !open && setReviewing(null)}
        proposal={reviewing}
        onSuccess={() => {
          setReviewing(null)
          fetchData()
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus Proposal"
        message={`Yakin ingin menghapus "${deleting?.title}"?`}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  )
}
