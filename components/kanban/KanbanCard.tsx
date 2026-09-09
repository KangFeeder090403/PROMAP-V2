'use client'

import { AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'

export interface KanbanTask {
  id: string
  title: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: string
  picId: string
  endDate: string | null
  projectId: string
}

export function KanbanCard({
  task,
  picName,
  onDragStart,
}: {
  task: KanbanTask
  picName: string
  onDragStart: (e: React.DragEvent, taskId: string) => void
}) {
  const isOverdue =
    task.endDate && task.status !== 'COMPLETE' && new Date(task.endDate) < new Date()

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="bg-white rounded-lg border border-slate-200 shadow-sm p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <p className="text-sm font-medium text-slate-800">{task.title}</p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${AP_PRIORITY_STYLE[task.priority]}`}
        >
          {AP_PRIORITY_LABEL[task.priority]}
        </span>
        <span className="text-xs text-slate-500 truncate max-w-[45%]">{picName}</span>
      </div>

      {task.endDate && (
        <p className={`mt-2 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
          {new Date(task.endDate).toLocaleDateString('id-ID')}
        </p>
      )}
    </div>
  )
}
