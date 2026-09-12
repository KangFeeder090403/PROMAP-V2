'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { KanbanFloatingBar } from '@/components/kanban/KanbanFloatingBar'
import { useKanbanMarquee } from '@/hooks/useKanbanMarquee'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)
  const draggedBatchIds = useRef<string[]>([])
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

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

  // Keyboard shortcut: Esc to clear selection
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds.size])

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  async function handleQuickAdd(title: string) {
    try {
      const res = await fetch('/api/action-plans/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ title, outcomeKpi: title }],
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        showToast(errData.error || 'Gagal menambahkan Action Plan')
        return false
      }
      showToast(`Action Plan "${title}" berhasil ditambahkan ke Not Started!`)
      await fetchData()
    } catch {
      showToast('Terjadi kesalahan jaringan.')
      return false
    }
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

  const selectedItems = useMemo(() => {
    if (!items || selectedIds.size === 0) return []
    return items.filter((ap) => selectedIds.has(ap.id))
  }, [items, selectedIds])

  const handleSelectionChange = useCallback((ids: string[], append: boolean) => {
    setSelectedIds((prev) => {
      const next = append ? new Set(prev) : new Set<string>()
      ids.forEach((id) => next.add(id))
      return next
    })
  }, [])

  const { marqueeRect } = useKanbanMarquee({
    containerRef: boardRef,
    onSelectionChange: handleSelectionChange,
    disabled: loading || Boolean(selected),
  })

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
    // Jika kartu yang di-drag merupakan bagian dari kartu yang dipilih, bawa semua ID terpilih
    if (selectedIds.has(id)) {
      draggedBatchIds.current = Array.from(selectedIds)
    } else {
      draggedBatchIds.current = [id]
    }
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleCardClick(ap: ActionPlan, e: React.MouseEvent) {
    if (e.ctrlKey || e.metaKey) {
      // Toggle select
      e.stopPropagation()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(ap.id)) {
          next.delete(ap.id)
        } else {
          next.add(ap.id)
        }
        return next
      })
    } else {
      // Klik biasa tanpa modifier: buka detail drawer
      setSelected(ap)
    }
  }

  async function executeBatchAction(action: 'start' | 'complete' | 'review-complete', targetIds?: string[]) {
    const idsToRun = targetIds ?? Array.from(selectedIds)
    if (idsToRun.length === 0) return

    try {
      setBatchLoading(true)
      const res = await fetch('/api/action-plans/bulk-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToRun, action }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast(data.error || 'Gagal memproses aksi batch')
        return
      }

      const updatedCount = data.updated?.length ?? 0
      const failedCount = data.failed?.length ?? 0

      if (updatedCount > 0 && failedCount === 0) {
        showToast(`Berhasil memperbarui ${updatedCount} Action Plan.`)
      } else if (updatedCount > 0 && failedCount > 0) {
        showToast(`${updatedCount} Action Plan berhasil diperbarui, ${failedCount} dilewati/gagal.`)
      } else if (failedCount > 0) {
        showToast(`Gagal: ${data.failed[0]?.reason ?? 'Tidak dapat diproses'}`)
      }

      // Bersihkan seleksi kartu yang sukses diproses
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ;(data.updated as string[] | undefined)?.forEach((id) => next.delete(id))
        return next
      })

      await fetchData()
    } catch {
      showToast('Terjadi kesalahan jaringan saat memproses batch.')
    } finally {
      setBatchLoading(false)
    }
  }

  async function onDrop(targetColumn: KanbanColumnKey) {
    const batch = draggedBatchIds.current
    const singleId = draggedId.current
    draggedId.current = null
    draggedBatchIds.current = []

    const candidateIds = batch.length > 0 ? batch : singleId ? [singleId] : []
    if (candidateIds.length === 0 || !items) return

    // Jika hanya satu kartu
    if (candidateIds.length === 1) {
      const id = candidateIds[0]
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
      } else {
        await fetchData()
      }
      return
    }

    // Jika multi-drop (beberapa kartu di-drag sekaligus)
    // Cek aksi target yang valid untuk kolom tujuan
    let bulkAction: 'start' | 'complete' | 'review-complete' | null = null
    if (targetColumn === 'IN_PROGRESS') {
      bulkAction = 'start'
    } else if (targetColumn === 'DONE') {
      // Periksa apakah batch lebih condong ke complete personal atau review
      const hasPersonal = candidateIds.some((id) => {
        const a = items.find((it) => it.id === id)
        return a && (a.isPersonal || !a.taskId)
      })
      bulkAction = hasPersonal ? 'complete' : 'review-complete'
    } else if (targetColumn === 'REVIEW' || targetColumn === 'NEEDS_REVISION') {
      showToast('Transisi ini butuh catatan wajib — gunakan Drawer Detail untuk tiap Action Plan.')
      return
    }

    if (!bulkAction) {
      showToast('Transisi multi-kartu tidak diizinkan ke kolom ini.')
      return
    }

    await executeBatchAction(bulkAction, candidateIds)
  }

  function refreshSelected(ap: ActionPlan) {
    void fetchData()
    fetch(`/api/action-plans/${ap.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((updated) => {
        if (updated) setSelected(updated)
      })
  }

  if (loading && !items) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse mt-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 w-full">
          {KANBAN_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="min-w-0 flex flex-col bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3"
            >
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{col.title}</span>
                <span className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
              </div>
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5 animate-pulse"
                  >
                    <div className="flex justify-between">
                      <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-3.5 w-12 bg-slate-100 dark:bg-slate-800/70 rounded" />
                    </div>
                    <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-800/50 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && !items) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Board</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visualisasi alur pengerjaan Action Plan dalam 5 tahap kanban.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
          <button
            onClick={() => void fetchData()}
            className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Board</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Visualisasi alur pengerjaan Action Plan dalam 5 tahap kanban.
        </p>
      </div>

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

        {items && items.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center">
            <p className="text-base font-medium text-slate-800 dark:text-slate-200">Belum ada Action Plan</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Buat Action Plan terlebih dahulu untuk mulai memantau pengerjaan di papan kanban.
            </p>
            <Link
              href="/action-plans"
              className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              Ke Action Plans
            </Link>
          </div>
        ) : scoped.length === 0 && search.trim() ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Tidak ada Action Plan yang cocok dengan &quot;{search}&quot;
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Coba periksa kembali ejaan atau gunakan kata kunci lain.
            </p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-3 inline-flex items-center gap-2 h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div ref={boardRef} className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 w-full items-start select-none">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.key}
                title={col.title}
                columnKey={col.key}
                items={columns.get(col.key) ?? []}
                selectedIds={selectedIds}
                canDrag={canDrag}
                onDragStart={onDragStart}
                onDrop={onDrop}
                onCardClick={handleCardClick}
                onQuickAdd={col.key === 'NOT_STARTED' ? handleQuickAdd : undefined}
              />
            ))}

            {marqueeRect && (
              <div
                className="fixed pointer-events-none z-50 border border-blue-500 bg-blue-500/15 rounded"
                style={{
                  left: marqueeRect.left,
                  top: marqueeRect.top,
                  width: marqueeRect.width,
                  height: marqueeRect.height,
                }}
              />
            )}
          </div>
        )}

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

        <KanbanFloatingBar
          selectedCount={selectedIds.size}
          selectedItems={selectedItems}
          userId={userId}
          role={role}
          divisionId={divisionId}
          onClearSelection={() => setSelectedIds(new Set())}
          onBatchAction={(action) => void executeBatchAction(action)}
          loading={batchLoading}
        />
      </div>
    </div>
  )
}
