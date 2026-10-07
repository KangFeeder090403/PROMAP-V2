'use client'

import React from 'react'
import { MoreHorizontal } from 'lucide-react'
import { KanbanCard } from '@/components/kanban/KanbanCard'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import type { KanbanColumnKey } from '@/lib/action-plan-status'
import { InlineQuickAdd } from '@/components/action-plans/InlineQuickAdd'

// Warna dot per kolom, sesuai gambar
const COLUMN_DOT: Record<KanbanColumnKey, string> = {
  NOT_STARTED: 'bg-slate-400',
  IN_PROGRESS: 'bg-sky-500',
  REVIEW: 'bg-indigo-500',
  NEEDS_REVISION: 'bg-red-500',
  DONE: 'bg-emerald-500',
}

export function KanbanColumn({
  title,
  columnKey,
  items,
  selectedIds,
  canDrag,
  onDragStart,
  onDrop,
  onCardClick,
  onQuickAdd,
}: {
  title: string
  columnKey: KanbanColumnKey
  items: ActionPlan[]
  selectedIds?: Set<string>
  canDrag: (ap: ActionPlan) => boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDrop: (columnKey: KanbanColumnKey) => void
  onCardClick: (ap: ActionPlan, e: React.MouseEvent) => void
  onQuickAdd?: (title: string) => Promise<boolean | void>
}) {
  const [isDragOver, setIsDragOver] = React.useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!isDragOver) setIsDragOver(true)
      }}
      onDragLeave={(e) => {
        // dragleave juga fires saat pointer melintasi elemen anak —
        // hanya reset kalau benar-benar keluar dari kolom
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setIsDragOver(false)
      }}
      onDrop={() => {
        setIsDragOver(false)
        onDrop(columnKey)
      }}
      className={`flex flex-col min-w-0 rounded-xl border transition-colors duration-150 p-2.5 sm:p-3 h-full ${
        isDragOver
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-900/10'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40'
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pb-2.5 border-b border-slate-200/80 dark:border-slate-800/80 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${COLUMN_DOT[columnKey]}`} />
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide truncate">
            {title}
          </h3>
          <span className="ml-1 min-w-[18px] h-4 px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center">
            {items.length}
          </span>
        </div>
        <button
          className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="Opsi kolom"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quick Add for Not Started column */}
      {columnKey === 'NOT_STARTED' && onQuickAdd && (
        <div className="mb-2.5">
          <InlineQuickAdd
            buttonText="+ Tambah Cepat"
            placeholder="Ketik judul AP..."
            className="w-full"
            onAdd={onQuickAdd}
          />
        </div>
      )}

      {/* Cards container */}
      <div className="space-y-2.5 min-h-[100px] flex-1">
        {items.map((ap) => (
          <KanbanCard
            key={ap.id}
            ap={ap}
            draggable={canDrag(ap)}
            isSelected={selectedIds?.has(ap.id)}
            onDragStart={onDragStart}
            onClick={(e) => onCardClick(ap, e)}
          />
        ))}
        {items.length === 0 && (
          <div className="h-20 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 dark:text-slate-500">Kosong</p>
          </div>
        )}
      </div>
    </div>
  )
}

