'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { AlertTriangle, Calendar, GripVertical } from 'lucide-react'
import { AP_PRIORITY_STYLE, AP_PRIORITY_LABEL, AP_STATUS_STYLE, AP_STATUS_LABEL } from '@/lib/status-labels'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'

// Palet warna untuk category badge (division/project) — cycling berdasarkan char pertama (bebas violet/pink)
const CATEGORY_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
]

// Palet warna avatar PIC — cycling berdasarkan inisial (bebas violet/pink)
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-slate-600',
  'bg-blue-600',
]

function colorForString(s: string, palette: string[]): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (s.codePointAt(i) ?? 0) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

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
  const avatarColor = colorForString(ap.pic?.name ?? ap.picId, AVATAR_COLORS)
  const categoryColor = colorForString(categoryLabel, CATEGORY_COLORS)

  const checklistPct =
    ap.checklistTotal > 0 ? Math.round((ap.checklistDone / ap.checklistTotal) * 100) : null

  const isOverdue = ap.status === 'OVERDUE' || new Date(ap.endDate) < new Date()
  const isPendingApproval = ap.status === 'PENDING_APPROVAL'

  const cardRef = useRef<HTMLDivElement>(null)

  function handleDragStart(e: React.DragEvent) {
    onDragStart(e, ap.id)
    requestAnimationFrame(() => {
      if (cardRef.current) gsap.to(cardRef.current, { opacity: 0.45, scale: 0.98, duration: 0.18 })
    })
  }

  function handleDragEnd() {
    if (cardRef.current) gsap.to(cardRef.current, { opacity: 1, scale: 1, duration: 0.2, clearProps: 'opacity,scale' })
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
      className={`group rounded-xl border shadow-sm p-3.5 transition-all duration-150 select-none ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-[transform,box-shadow,border-color] duration-200 ease-out motion-reduce:hover:translate-y-0 motion-reduce:transition-none'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
    >
      {/* Row 1: Code + Category badge + drag handle */}
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 shrink-0">
            {ap.code}
          </span>
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide truncate ${categoryColor}`}
            title={categoryLabel}
          >
            {categoryLabel}
          </span>
        </div>
        {draggable && (
          <GripVertical className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
        )}
      </div>

      {/* Sub-status badge (PENDING_APPROVAL, REJECTED, OVERDUE, dst) */}
      {subStatusBadge && (
        <div className="mb-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${AP_STATUS_STYLE[subStatusBadge]}`}
          >
            {subStatusBadge === 'OVERDUE' && <AlertTriangle className="h-3 w-3" />}
            {AP_STATUS_LABEL[subStatusBadge]}
          </span>
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug mb-2.5">
        {ap.title}
      </p>

      {/* Checklist progress */}
      {ap.checklistTotal > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Checklist {ap.checklistDone}/{ap.checklistTotal} ({checklistPct}%)
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${checklistPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${checklistPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Evidence attachment icon (jika ada evidenceLink) */}
      {ap.evidenceLink && (
        <div className="mb-2 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Evidence Att...
        </div>
      )}

      {/* Review note (untuk NEEDS_REVISION) */}
      {ap.reviewNote && ap.status === 'REJECTED' && (
        <div className="mb-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">Review Note:</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 italic">
            &ldquo;{ap.reviewNote}&rdquo;
          </p>
        </div>
      )}

      {/* Footer: priority + deadline + avatar */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-2 min-w-0">
          {/* Priority */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${AP_PRIORITY_STYLE[ap.priority]}`}
          >
            {ap.priority === 'HIGH' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
            {ap.priority === 'MEDIUM' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
            {ap.priority === 'LOW' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />}
            {AP_PRIORITY_LABEL[ap.priority]}
          </span>

          {/* Deadline */}
          <span
            className={`inline-flex items-center gap-1 text-[11px] ${
              isOverdue ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Calendar className="h-3 w-3 shrink-0" />
            {isOverdue && ap.status !== 'OVERDUE' ? 'Due: ' : ''}
            {formatDate(ap.endDate)}
          </span>
        </div>

        {/* Avatar PIC */}
        <div
          className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${avatarColor}`}
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
          className="mt-2.5 w-full h-7 rounded-md bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-xs font-semibold transition-colors"
        >
          Review
        </button>
      )}
    </div>
  )
}
