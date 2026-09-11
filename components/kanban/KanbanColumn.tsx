'use client'

import React from 'react'
import { MoreHorizontal } from 'lucide-react'
import { KanbanCard } from '@/components/kanban/KanbanCard'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import type { KanbanColumnKey } from '@/lib/action-plan-status'

// Warna dot per kolom, sesuai gambar
const COLUMN_DOT: Record<KanbanColumnKey, string> = {
  NOT_STARTED: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  REVIEW: 'bg-indigo-500',
  NEEDS_REVISION: 'bg-red-500',
  DONE: 'bg-emerald-500',
}

export function KanbanColumn({
  title,
  columnKey,
  items,
  canDrag,
  onDragStart,
  onDrop,
  onCardClick,
}: {
  title: string
  columnKey: KanbanColumnKey
  items: ActionPlan[]
  canDrag: (ap: ActionPlan) => boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDrop: (columnKey: KanbanColumnKey) => void
  onCardClick: (ap: ActionPlan) => void
}) {
  const [isDragOver, setIsDragOver] = React.useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => {
        setIsDragOver(false)
        onDrop(columnKey)
      }}
      className={`flex-1 min-w-[270px] max-w-[320px] flex flex-col rounded-xl border transition-colors duration-150 ${
        isDragOver
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-900/10'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40'
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${COLUMN_DOT[columnKey]}`} />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
          <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center">
            {items.length}
          </span>
        </div>
        <button
          className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="Opsi kolom"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto">
        {items.map((ap) => (
          <KanbanCard
            key={ap.id}
            ap={ap}
            draggable={canDrag(ap)}
            onDragStart={onDragStart}
            onClick={() => onCardClick(ap)}
          />
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-slate-400 dark:text-slate-600">Tidak ada item</p>
          </div>
        )}
      </div>
    </div>
  )
}

