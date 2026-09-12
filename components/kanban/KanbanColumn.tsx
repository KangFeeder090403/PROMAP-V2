'use client'

import { KanbanCard } from '@/components/kanban/KanbanCard'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import type { KanbanColumnKey } from '@/lib/action-plan-status'
import { InlineQuickAdd } from '@/components/action-plans/InlineQuickAdd'

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
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(columnKey)}
      className="flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 h-full"
    >
      <div className="flex items-center justify-between px-1 pb-2.5">
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide truncate">
          {title}
        </h3>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-1.5 shrink-0">
          {items.length}
        </span>
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

