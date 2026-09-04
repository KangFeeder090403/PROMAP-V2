'use client'

import { KanbanCard, type KanbanTask } from '@/components/kanban/KanbanCard'

export function KanbanColumn({
  title,
  status,
  tasks,
  picNameOf,
  onDragStart,
  onDrop,
}: {
  title: string
  status: string
  tasks: KanbanTask[]
  picNameOf: (picId: string) => string
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onDrop: (status: string) => void
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(status)}
      className="flex-1 min-w-[260px] bg-slate-50 rounded-lg border border-slate-200 p-3"
    >
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</h3>
        <span className="text-xs text-slate-400">{tasks.length}</span>
      </div>

      <div className="space-y-2.5 min-h-[80px]">
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} picName={picNameOf(t.picId)} onDragStart={onDragStart} />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Kosong</p>
        )}
      </div>
    </div>
  )
}
