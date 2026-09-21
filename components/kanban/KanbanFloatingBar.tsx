'use client'

import { CheckSquare, Play, CheckCircle2, X } from 'lucide-react'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import type { Role } from '@/lib/generated/prisma/client'

interface KanbanFloatingBarProps {
  selectedCount: number
  selectedItems: ActionPlan[]
  userId: string
  role: Role
  divisionId?: string | null
  onClearSelection: () => void
  onBatchAction: (action: 'start' | 'complete' | 'review-complete') => void
  loading?: boolean
}

export function KanbanFloatingBar({
  selectedCount,
  selectedItems,
  userId,
  role,
  divisionId,
  onClearSelection,
  onBatchAction,
  loading = false,
}: KanbanFloatingBarProps) {
  if (selectedCount === 0) return null

  // Evaluasi kemampuan aksi batch dari kumpulan item terpilih
  const canBatchStart = selectedItems.some(
    (ap) =>
      ap.picId === userId &&
      ['NOT_STARTED', 'REJECTED', 'OVERDUE'].includes(ap.status)
  )

  const canBatchComplete = selectedItems.some(
    (ap) =>
      (ap.isPersonal || !ap.taskId) &&
      ap.picId === userId &&
      ['NOT_STARTED', 'IN_PROGRESS', 'EVIDENCE_REQUIRED', 'REJECTED', 'OVERDUE'].includes(ap.status)
  )

  const canBatchReviewComplete = selectedItems.some((ap) => {
    const isOwner = ap.picId === userId
    return (
      !isOwner &&
      ap.status === 'PENDING_APPROVAL' &&
      (role === 'SUPER_ADMIN' ||
        role === 'ADMIN_OPERATIONAL' ||
        (role === 'MANAGER' && divisionId && divisionId === ap.divisionId))
    )
  })

  return (
    <div
      data-kanban-ignore-marquee="true"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700/50 backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
        <CheckSquare className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-semibold tracking-tight">
          {selectedCount} <span className="text-xs font-normal text-slate-300">dipilih</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {canBatchStart && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onBatchAction('start')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-colors disabled:opacity-50"
            title="Mulai Action Plan terpilih yang belum berjalan"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Mulai</span>
          </button>
        )}

        {canBatchComplete && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onBatchAction('complete')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-colors disabled:opacity-50"
            title="Selesaikan Action Plan personal terpilih"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Selesaikan</span>
          </button>
        )}

        {canBatchReviewComplete && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onBatchAction('review-complete')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-500 active:bg-green-700 text-white transition-colors disabled:opacity-50"
            title="Setujui Action Plan review terpilih"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Setujui (Review)</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onClearSelection}
        className="ml-1 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
        title="Batal pilih (Esc)"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Batal</span>
      </button>
    </div>
  )
}
