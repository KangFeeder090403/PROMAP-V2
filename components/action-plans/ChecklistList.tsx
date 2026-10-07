'use client'

import { useEffect, useState } from 'react'
import { checklistItemSchema } from '@/lib/validations/actionPlan'

interface ChecklistItem {
  id: string
  title: string
  isDone: boolean
}

export function ChecklistList({
  actionPlanId,
  editable,
  onCountChange,
}: {
  actionPlanId: string
  editable: boolean
  onCountChange?: (done: number, total: number) => void
}) {
  const [items, setItems] = useState<ChecklistItem[] | null>(null)
  const [error, setError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [actionPlanId])

  async function fetchItems() {
    try {
      setError('')
      const res = await fetch(`/api/action-plans/${actionPlanId}/checklists`)
      if (!res.ok) throw new Error()
      const data: ChecklistItem[] = await res.json()
      setItems(data)
      const done = data.filter((i) => i.isDone).length
      onCountChange?.(done, data.length)
    } catch {
      setError('Gagal memuat checklist.')
    }
  }

  async function handleToggle(item: ChecklistItem) {
    setError('')
    const res = await fetch(`/api/action-plans/${actionPlanId}/checklists/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDone: !item.isDone }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(res.status === 409 ? 'Status sudah berubah, silakan refresh' : data.error || 'Gagal update checklist')
      return
    }
    fetchItems()
  }

  async function handleDelete(item: ChecklistItem) {
    setError('')
    const res = await fetch(`/api/action-plans/${actionPlanId}/checklists/${item.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Gagal menghapus checklist')
      return
    }
    fetchItems()
  }

  async function handleAdd() {
    const parsed = checklistItemSchema.safeParse({ title: newTitle })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Data tidak valid')
      return
    }
    setError('')
    setAdding(true)
    const res = await fetch(`/api/action-plans/${actionPlanId}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })
    setAdding(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Gagal menambah checklist')
      return
    }
    setNewTitle('')
    fetchItems()
  }

  if (items === null) return <p className="text-sm text-slate-500">Memuat...</p>

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada checklist.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.isDone}
                disabled={!editable}
                onChange={() => handleToggle(item)}
                className="h-4 w-4 rounded border-slate-300 text-blue-500 dark:text-blue-300 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className={`text-sm flex-1 ${item.isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {item.title}
              </span>
              {editable && (
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Hapus
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tambah checklist..."
            className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newTitle.trim()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {adding ? '...' : 'Tambah'}
          </button>
        </div>
      )}
    </div>
  )
}
