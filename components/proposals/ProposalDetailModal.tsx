'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Proposal } from '@/components/proposals/ProposalsClient'
import {
  CheckCircle2,
  XCircle,
  Rocket,
  FileEdit,
  User,
  Calendar,
  Clock,
  SendHorizonal,
} from 'lucide-react'

interface ProposalDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: Proposal | null
  role: string
  userId: string
  onEdit: (p: Proposal) => void
  onSubmit: (p: Proposal) => void
  onReview: (p: Proposal) => void
  onConvert: (p: Proposal) => void
}

const STATUS_MAP = {
  DRAFT: {
    label: 'Draft',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  SUBMITTED: {
    label: 'Menunggu Review',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  APPROVED: {
    label: 'Disetujui',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Ditolak',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
} as const

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ProposalDetailModal({
  open,
  onOpenChange,
  proposal,
  role,
  userId,
  onEdit,
  onSubmit,
  onReview,
  onConvert,
}: ProposalDetailModalProps) {
  if (!proposal) return null

  const isOwner = proposal.proposerId === userId
  const canReview =
    ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'].includes(role) &&
    proposal.status === 'SUBMITTED' &&
    proposal.proposerId !== userId
  const canOpenDraft =
    !isOwner &&
    proposal.status === 'DRAFT' &&
    ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'].includes(role)

  const st = STATUS_MAP[proposal.status] ?? STATUS_MAP.DRAFT

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800 p-0">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(proposal.createdAt)}</span>
            </div>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {proposal.title}
          </DialogTitle>
        </div>

        <div className="p-6 space-y-5">
          {/* Info Pengusul */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pengusul Inisiatif</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {isOwner ? `${proposal.proposer?.name || 'Anda'} (Anda)` : proposal.proposer?.name || '—'}
                </p>
              </div>
            </div>
            {proposal.proposer?.role && (
              <span className="text-xs px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                {proposal.proposer.role}
              </span>
            )}
          </div>

          {/* Isi Deskripsi Proposal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Rincian Usulan
            </h4>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950/40">
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {proposal.description || 'Tidak ada keterangan rincian.'}
              </p>
            </div>
          </div>

          {/* Catatan Review Manajer */}
          {proposal.reviewNote && (
            <div
              className={`p-4 rounded-lg border ${
                proposal.status === 'APPROVED'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-1">
                Catatan Review Manajer
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {proposal.reviewNote}
              </p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {/* Draft owner */}
            {isOwner && proposal.status === 'DRAFT' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(proposal)
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  Edit Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onSubmit(proposal)
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <SendHorizonal className="w-3.5 h-3.5" />
                  Ajukan Proposal
                </button>
              </>
            )}

            {/* Non-owner inspect draft */}
            {canOpenDraft && (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  onEdit(proposal)
                }}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <FileEdit className="w-3.5 h-3.5" />
                Buka & Edit Draft
              </button>
            )}

            {/* Reviewer Action */}
            {canReview && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onReview(proposal)
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Tolak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onReview(proposal)
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Setujui
                </button>
              </>
            )}

            {/* Convert to Action Plan */}
            {proposal.status === 'APPROVED' && (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  onConvert(proposal)
                }}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <Rocket className="w-3.5 h-3.5" />
                Jadikan Action Plan
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
