'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { AlertTriangle, Calendar, GripVertical, Paperclip } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_PRIORITY_STYLE, AP_PRIORITY_LABEL, AP_STATUS_STYLE, AP_STATUS_LABEL } from '@/lib/status-labels'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'

function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function KanbanCard({
  ap,
  draggable,
  isSelected = false,
  onDragStart,
  onClick,
}: Readonly<{
  ap: ActionPlan
  draggable: boolean
  isSelected?: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onClick: (e: React.MouseEvent) => void
}>) {
  // Label kategori: pakai division, fallback ke project, fallback ke 'Personal'
  const categoryLabel = ap.division?.name ?? ap.task?.project?.name ?? 'Personal'

  // Sub-status badge khusus (OVERDUE, EVIDENCE_REQUIRED, PENDING_APPROVAL, REJECTED, COMPLETE, APPROVED)
  const specialStatuses = ['OVERDUE', 'EVIDENCE_REQUIRED', 'PENDING_APPROVAL', 'REJECTED', 'COMPLETE', 'APPROVED']
  const subStatusBadge = specialStatuses.includes(ap.status) ? ap.status : null

  const picInitials = initials(ap.pic?.name)

  const checklistPct =
    ap.checklistTotal > 0 ? Math.round((ap.checklistDone / ap.checklistTotal) * 100) : null

  const isOverdue = ap.status === 'OVERDUE' || new Date(ap.endDate) < new Date()
  const isPendingApproval = ap.status === 'PENDING_APPROVAL'

  const cardRef = useRef<HTMLDivElement>(null)

  function handleDragStart(e: React.DragEvent) {
    onDragStart(e, ap.id)
    requestAnimationFrame(() => {
      // opacity saja — `scale` menulis ke `transform`, properti yang sama yang
      // dipakai hover-lift Tailwind (`hover:-translate-y-0.5`).
      if (cardRef.current) gsap.to(cardRef.current, { opacity: 0.45, duration: 0.18 })
    })
  }

  function handleDragEnd() {
    if (cardRef.current) gsap.to(cardRef.current, { opacity: 1, duration: 0.2, clearProps: 'opacity' })
  }

  return (
    <div
      ref={cardRef}
      data-kanban-card-id={ap.id}
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => draggable && handleDragStart(e)}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(e as unknown as React.MouseEvent)
        }
      }}
      title={!draggable ? 'Lihat detail (tidak bisa dipindah oleh Anda)' : undefined}
      className={`group rounded-lg border shadow-sm p-3.5 transition-all duration-150 select-none ${
        isSelected
          ? 'ring-2 ring-ring/20 border-primary bg-accent'
          : 'bg-card border-border hover:shadow-md hover:border-input hover:-translate-y-0.5 transition-[transform,box-shadow,border-color] duration-200 ease-out motion-reduce:hover:translate-y-0 motion-reduce:transition-none'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
    >
      {/* Row 1: Code + Category badge + drag handle */}
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-mono tabular-nums text-xs font-semibold text-fg-secondary shrink-0">
            {ap.code}
          </span>
          <span
            className={`inline-block px-2 py-0.5 rounded-sm text-xs font-semibold uppercase tracking-wide truncate bg-muted text-fg-secondary border border-border`}
            title={categoryLabel}
          >
            {categoryLabel}
          </span>
        </div>
        {draggable && (
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
        )}
      </div>

      {/* Sub-status badge (PENDING_APPROVAL, REJECTED, OVERDUE, dst) */}
      {subStatusBadge && (
        <div className="mb-2 flex items-center gap-1">
          {subStatusBadge === 'OVERDUE' && <AlertTriangle className="h-3 w-3 text-destructive-text" aria-hidden="true" />}
          <StatusBadge status={subStatusBadge} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-2.5">
        {ap.title}
      </p>

      {/* Checklist progress */}
      {ap.checklistTotal > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              Checklist {ap.checklistDone}/{ap.checklistTotal} ({checklistPct}%)
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${checklistPct === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${checklistPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Evidence attachment icon (jika ada evidenceLink) */}
      {ap.evidenceLink && (
        <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Paperclip className="h-3 w-3" aria-hidden="true" />
          Evidence Att...
        </div>
      )}

      {/* Review note (untuk NEEDS_REVISION) */}
      {ap.reviewNote && ap.status === 'REJECTED' && (
        <div className="mb-2.5 bg-muted rounded-md p-2 border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-0.5">Review Note:</p>
          <p className="text-xs text-fg-secondary line-clamp-2 italic">
            &ldquo;{ap.reviewNote}&rdquo;
          </p>
        </div>
      )}

      {/* Footer: priority + deadline + avatar */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-2 min-w-0">
          {/* Priority */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${AP_PRIORITY_STYLE[ap.priority]}`}
          >
            {ap.priority === 'HIGH' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
            {ap.priority === 'MEDIUM' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
            {ap.priority === 'LOW' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />}
            {AP_PRIORITY_LABEL[ap.priority]}
          </span>

          {/* Deadline */}
          <span
            className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums ${
              isOverdue ? 'text-destructive-text font-semibold' : 'text-muted-foreground'
            }`}
          >
            <Calendar className="h-3 w-3 shrink-0" />
            {isOverdue && ap.status !== 'OVERDUE' ? 'Due: ' : ''}
            {formatDate(ap.endDate)}
          </span>
        </div>

        {/* Avatar PIC */}
        <div
          className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-fg-secondary text-xs font-bold bg-muted border border-border`}
          title={ap.pic?.name ?? 'Tidak ada PIC'}
        >
          {picInitials}
        </div>
      </div>

      {/* Review button — muncul jika PENDING_APPROVAL (untuk reviewer) */}
      {isPendingApproval && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClick(e)
          }}
          className="mt-2.5 w-full h-7 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-colors"
        >
          Review
        </button>
      )}
    </div>
  )
}
