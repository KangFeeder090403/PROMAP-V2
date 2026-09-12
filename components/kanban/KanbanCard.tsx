'use client'

import React from 'react'
import { AP_PRIORITY_STYLE, AP_PRIORITY_LABEL, AP_STATUS_STYLE, AP_STATUS_LABEL } from '@/lib/status-labels'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'

export function KanbanCard({
  ap,
  draggable,
  onDragStart,
  onClick,
}: {
  ap: ActionPlan
  draggable: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onClick: () => void
}) {
  const projectLabel = ap.task?.project?.name ?? 'Personal'
  // Kolom "Dikerjakan" & "Review" masing-masing menggabung 2 status backend jadi 1
  // kolom (§PRD B7) — badge ini beda-in sub-status yang butuh perhatian berbeda:
  // OVERDUE (masih boleh /start) vs EVIDENCE_REQUIRED (nunggu PIC submit ulang,
  // reviewer BELUM bisa langsung selesaikan dari sini).
  const subStatusBadge = ap.status === 'OVERDUE' || ap.status === 'EVIDENCE_REQUIRED' ? ap.status : null

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => draggable && onDragStart(e, ap.id)}
      onClick={onClick}
      title={!draggable ? 'Lihat detail (tidak bisa dipindah oleh Anda)' : undefined}
      className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-3.5 cursor-pointer hover:shadow-md transition-shadow ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">{ap.code}</span>
        {subStatusBadge && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${AP_STATUS_STYLE[subStatusBadge]}`}>
            {AP_STATUS_LABEL[subStatusBadge]}
          </span>
        )}
      </div>

      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">{ap.title}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{projectLabel}</p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${AP_PRIORITY_STYLE[ap.priority]}`}
        >
          {AP_PRIORITY_LABEL[ap.priority]}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[45%]">
          {ap.pic?.name ?? '—'}
        </span>
      </div>

      {ap.checklistTotal > 0 && (
        <div className="mt-2.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${Math.round((ap.checklistDone / ap.checklistTotal) * 100)}%` }}
          />
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-mono">
        {new Date(ap.endDate).toLocaleDateString('id-ID')}
      </p>
    </div>
  )
}
