'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import type { KanbanTask } from '@/components/kanban/KanbanCard'

const COLUMNS = [
  { status: 'NOT_STARTED', title: 'Belum Mulai' },
  { status: 'IN_PROGRESS', title: 'Dikerjakan' },
  { status: 'COMPLETE', title: 'Selesai' },
] as const

interface Project {
  id: string
  name: string
}

export function KanbanClient({
  role,
  userId,
  projectId,
}: {
  role: Role
  userId: string
  projectId: string
}) {
  const router = useRouter()

  // Project picker state (dipakai kalau projectId kosong)
  const [projects, setProjects] = useState<Project[] | null>(null)

  const [tasks, setTasks] = useState<KanbanTask[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [picNames, setPicNames] = useState<Record<string, string>>({})
  const draggedTaskId = useRef<string | null>(null)

  useEffect(() => {
    if (projectId) return
    fetch('/api/projects')
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => setProjects([]))
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    fetchTasks()
    // PIC tidak punya akses /api/users — cukup tampilkan "Anda" untuk diri sendiri.
    if (role !== 'PIC') {
      fetch('/api/users')
        .then((r) => (r.ok ? r.json() : []))
        .then((list: { id: string; name: string }[]) => {
          setPicNames(Object.fromEntries(list.map((u) => [u.id, u.name])))
        })
        .catch(() => {})
    }
  }, [projectId])

  async function fetchTasks() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/tasks?projectId=${projectId}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      setTasks(await res.json())
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  function picNameOf(picId: string) {
    if (picId === userId) return 'Anda'
    return picNames[picId] ?? picId
  }

  function onDragStart(e: React.DragEvent, taskId: string) {
    draggedTaskId.current = taskId
    e.dataTransfer.effectAllowed = 'move'
  }

  async function onDrop(newStatus: string) {
    const taskId = draggedTaskId.current
    draggedTaskId.current = null
    if (!taskId || !tasks) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    const prevTasks = tasks
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!res.ok) {
      setTasks(prevTasks)
      setError('Gagal memindahkan task, coba lagi.')
      setTimeout(() => setError(null), 3000)
    }
  }

  // Project picker — belum ada projectId di URL
  if (!projectId) {
    if (!projects) return <div className="text-sm text-slate-500">Memuat...</div>
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Pilih project untuk melihat papan Kanban</p>
        {projects.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <p className="text-sm text-slate-500">Belum ada project</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => router.push(`/board?projectId=${p.id}`)}
                className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 text-left hover:border-blue-300 hover:shadow-md transition-all"
              >
                <p className="text-[15px] font-medium text-slate-800">{p.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading && !tasks) return <div className="text-sm text-slate-500">Memuat...</div>

  if (error && !tasks) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <p className="text-sm text-slate-700">{error}</p>
        <button
          onClick={fetchTasks}
          className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (!tasks) return null

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => router.push('/board')}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        &larr; Ganti project
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status}
            tasks={tasks.filter((t) => t.status === col.status)}
            picNameOf={picNameOf}
            onDragStart={onDragStart}
            onDrop={onDrop}
          />
        ))}
      </div>
    </div>
  )
}
