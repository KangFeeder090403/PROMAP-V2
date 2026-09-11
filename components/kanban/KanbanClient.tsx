'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { ActionPlanDetail } from '@/components/action-plans/ActionPlanDetail'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import {
  KANBAN_COLUMNS,
  columnForStatus,
  resolveKanbanDrop,
  canDragKanbanCard,
  type KanbanColumnKey,
} from '@/lib/action-plan-status'

const PAGE_SIZE = 50
// Batas realistis satu company, sama semangatnya dengan AP_QUERY_CAP di dashboard route.
const FETCH_CAP = 2000

async function fetchAllActionPlans(): Promise<ActionPlan[]> {
  const all: ActionPlan[] = []
  let page = 1
  for (;;) {
    const res = await fetch(`/api/action-plans?page=${page}&pageSize=${PAGE_SIZE}`)
    if (!res.ok) throw new Error('Gagal memuat data')
    const json: { items: ActionPlan[]; total: number } = await res.json()
    all.push(...json.items)
    if (json.items.length === 0 || all.length >= json.total || all.length >= FETCH_CAP) break
    page++
  }
  return all
}

export function KanbanClient({
  role,
  userId,
  divisionId,
  projectId,
}: {
  role: Role
  userId: string
  divisionId?: string | null
  projectId: string
}) {
  const router = useRouter()
  const [items, setItems] = useState<ActionPlan[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ActionPlan | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setItems(await fetchAllActionPlans())
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  const projectLabel = useMemo(() => {
    if (!projectId || !items) return null
    return items.find((ap) => ap.task?.project?.id === projectId)?.task?.project?.name ?? 'project ini'
  }, [items, projectId])

  const scoped = useMemo(() => {
    if (!items) return []
    let rows = items
    if (projectId) rows = rows.filter((ap) => ap.task?.project?.id === projectId)
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((ap) => ap.title.toLowerCase().includes(q) || ap.code.toLowerCase().includes(q))
    return rows
  }, [items, projectId, search])

  const columns = useMemo(() => {
    const map = new Map<KanbanColumnKey, ActionPlan[]>(KANBAN_COLUMNS.map((c) => [c.key, [] as ActionPlan[]]))
    for (const ap of scoped) {
      map.get(columnForStatus(ap.status))!.push(ap)
    }
    return map
  }, [scoped])

  function canDrag(ap: ActionPlan) {
    return canDragKanbanCard(ap, { id: userId, role, divisionId })
  }

  function onDragStart(e: React.DragEvent, id: string) {
    draggedId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  async function onDrop(targetColumn: KanbanColumnKey) {
    const id = draggedId.current
    draggedId.current = null
    if (!id || !items) return

    const ap = items.find((a) => a.id === id)
    if (!ap) return
    if (columnForStatus(ap.status) === targetColumn) return

    const action = resolveKanbanDrop(ap, targetColumn, { id: userId, role, divisionId })
    if (!action) {
      showToast('Transisi tidak diizinkan untuk status atau peran Anda saat ini.')
      return
    }
    if (action.kind === 'needs-note') {
      showToast('Transisi ini butuh catatan — lengkapi lewat detail Action Plan yang baru dibuka.')
      setSelected(ap)
      return
    }

    const config = {
      start: { url: `/api/action-plans/${id}/start`, status: 'IN_PROGRESS' },
      complete: { url: `/api/action-plans/${id}/complete`, status: 'COMPLETE' },
      'review-complete': { url: `/api/action-plans/${id}/review`, status: 'COMPLETE' },
    }[action.kind]

    const prevItems = items
    setItems(items.map((a) => (a.id === id ? { ...a, status: config.status } : a)))

    const res = await fetch(config.url, {
      method: 'POST',
      ...(action.kind === 'review-complete'
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'COMPLETE' }) }
        : {}),
    })

    if (!res.ok) {
      setItems(prevItems)
      const data = await res.json().catch(() => ({}))
      showToast(data.error || 'Gagal memindahkan Action Plan, coba lagi.')
    }
  }

  function refreshSelected(ap: ActionPlan) {
    void fetchData()
    fetch(`/api/action-plans/${ap.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((updated) => {
        if (updated) setSelected(updated)
      })
  }

  if (loading && !items) return <div className="text-sm text-slate-500 dark:text-slate-400">Memuat...</div>

  if (error && !items) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
        <button
          onClick={() => void fetchData()}
          className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau kode AP..."
            className="w-full h-9 pl-8 pr-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {projectId && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Difilter untuk <span className="font-medium text-slate-700 dark:text-slate-300">{projectLabel}</span>
            {' · '}
            <Link href="/board" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Lihat semua Action Plan
            </Link>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            title={col.title}
            columnKey={col.key}
            items={columns.get(col.key) ?? []}
            canDrag={canDrag}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onCardClick={setSelected}
          />
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-md rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      <ActionPlanDetail
        actionPlan={selected}
        role={role}
        userId={userId}
        onOpenChange={(open) => !open && setSelected(null)}
        onChanged={() => selected && refreshSelected(selected)}
        onEdit={() => {
          if (!selected) return
          router.push(`/action-plans?open=${selected.id}&highlight=${selected.id}`)
        }}
      />
    </div>
  )
}
