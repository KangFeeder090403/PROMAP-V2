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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-sidebar text-sidebar-foreground px-4 py-2.5 rounded-lg shadow-md border border-border animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-center gap-2 pr-3 border-r border-white/15">
        <CheckSquare className="h-4 w-4 text-sidebar-accent" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight">
          {selectedCount} <span className="text-xs font-normal text-sidebar-foreground/70">dipilih</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {canBatchStart && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onBatchAction('start')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-green-600 hover:bg-green-500 active:bg-green-700 text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        className="ml-1 p-1 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Batal pilih (Esc)"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Batal</span>
      </button>
    </div>
  )
}
