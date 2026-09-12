'use client'

import React from 'react'
import { KanbanCard } from '@/components/kanban/KanbanCard'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import type { KanbanColumnKey } from '@/lib/action-plan-status'

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
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(columnKey)}
      className="flex-1 min-w-[270px] bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800 p-3"
    >
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">{items.length}</span>
      </div>

      <div className="space-y-2.5 min-h-[80px]">
        {items.map((ap) => (
          <KanbanCard key={ap.id} ap={ap} draggable={canDrag(ap)} onDragStart={onDragStart} onClick={() => onCardClick(ap)} />
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Kosong</p>}
      </div>
    </div>
  )
}
