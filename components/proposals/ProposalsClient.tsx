'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PROPOSAL_STATUS_STYLE, PROPOSAL_STATUS_LABEL } from '@/lib/status-labels'
import { ProposalFormModal } from '@/components/proposals/ProposalFormModal'
import { ProposalReviewDialog } from '@/components/proposals/ProposalReviewDialog'
import { Plus } from 'lucide-react'

export interface Proposal {
  id: string
  proposerId: string
  title: string
  description: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  createdAt: string
  updatedAt: string
  proposer: { id: string; name: string } | null
}

// ── status badge ──────────────────────────────────────────────────────────────
function StatusBadge({
  status,
  styleMap,
  labelMap,
}: {
  status: string
  styleMap: Record<string, string>
  labelMap: Record<string, string>
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${styleMap[status] ?? ''}`}>
      {labelMap[status] ?? status}
    </span>
  )
}

const STATUS_FILTERS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const

// ── main component ────────────────────────────────────────────────────────────
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
  const [statusFilter, setStatusFilter] = useState<string>('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Proposal | null>(null)
  const [deleting, setDeleting] = useState<Proposal | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<Proposal | null>(null)
  const [detailProposal, setDetailProposal] = useState<Proposal | null>(null)

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (!openCreate) return
    setEditing(null)
    setFormOpen(true)
    router.replace('/proposals', { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreate])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/proposals')
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

  const canReview = (p: Proposal) =>
    ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'].includes(role) &&
    p.status === 'SUBMITTED' &&
    p.proposerId !== userId

  const displayed = (data ?? []).filter(
    (p) => statusFilter === '' || p.status === statusFilter
  )

  if (loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Memuat...</div>
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

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          Buat Usulan Baru
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* ── Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {displayed.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 p-5">Belum ada proposal.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3">Judul</th>
                <th className="px-5 py-3">Pengaju</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Dibuat</th>
                <th className="px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((p) => {
                const isOwner = p.proposerId === userId
                return (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 text-slate-800 dark:text-slate-100 font-medium max-w-[220px] truncate">
                      {p.title}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {isOwner ? 'Anda' : (p.proposer?.name ?? '—')}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={p.status}
                        styleMap={PROPOSAL_STATUS_STYLE}
                        labelMap={PROPOSAL_STATUS_LABEL}
                      />
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setDetailProposal(p)}
                          className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          Detail
                        </button>
                        {isOwner && p.status === 'DRAFT' && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setEditing(p); setFormOpen(true) }}
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubmit(p)}
                              disabled={submittingId === p.id}
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 disabled:opacity-50"
                            >
                              {submittingId === p.id ? 'Mengirim...' : 'Submit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(p)}
                              className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                        {canReview(p) && (
                          <button
                            type="button"
                            onClick={() => setReviewing(p)}
                            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
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

      {/* ── Modals ── */}
      <ProposalFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        proposal={editing}
        onSuccess={() => { setFormOpen(false); fetchData() }}
      />

      <ProposalReviewDialog
        open={!!reviewing}
        onOpenChange={(open) => !open && setReviewing(null)}
        proposal={reviewing}
        onSuccess={() => { setReviewing(null); fetchData() }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus Proposal"
        message={`Yakin ingin menghapus "${deleting?.title}"?`}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      {detailProposal && (
        <Dialog open={!!detailProposal} onOpenChange={(open) => !open && setDetailProposal(null)}>
          <DialogContent className="sm:max-w-lg dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 mb-1">
                <StatusBadge
                  status={detailProposal.status}
                  styleMap={PROPOSAL_STATUS_STYLE}
                  labelMap={PROPOSAL_STATUS_LABEL}
                />
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {new Date(detailProposal.createdAt).toLocaleDateString('id-ID')}
                </span>
              </div>
              <DialogTitle className="text-slate-900 dark:text-slate-100 text-base font-semibold">
                {detailProposal.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Diajukan oleh:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {detailProposal.proposer?.name ?? '—'}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 my-2">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-3.5 border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Deskripsi Proposal
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {detailProposal.description || 'Tidak ada deskripsi.'}
                </p>
              </div>

              {detailProposal.reviewNote && (
                <div className={`rounded-lg p-3.5 border ${
                  detailProposal.status === 'REJECTED'
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                }`}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                    Catatan Review ({detailProposal.status === 'REJECTED' ? 'Ditolak' : 'Disetujui'})
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{detailProposal.reviewNote}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDetailProposal(null)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
