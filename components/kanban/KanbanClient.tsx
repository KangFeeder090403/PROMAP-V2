'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  LayoutGrid,
  LayoutList,
  CalendarDays,
  X,
} from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { KanbanFloatingBar } from '@/components/kanban/KanbanFloatingBar'
import { useKanbanMarquee } from '@/hooks/useKanbanMarquee'
import { ActionPlanDetail } from '@/components/action-plans/ActionPlanDetail'
import { ActionPlanFormModal } from '@/components/action-plans/ActionPlanFormModal'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import {
  KANBAN_COLUMNS,
  columnForStatus,
  resolveKanbanDrop,
  canDragKanbanCard,
  type KanbanColumnKey,
} from '@/lib/action-plan-status'

async function fetchBoardActionPlans(params: {
  projectId?: string
  priority?: string
  picId?: string
  divisionId?: string
  dateRange?: string
  sortBy?: string
}): Promise<ActionPlan[]> {
  const query = new URLSearchParams({ view: 'board' })
  if (params.projectId) query.set('projectId', params.projectId)
  if (params.priority) query.set('priority', params.priority)
  if (params.picId) query.set('picId', params.picId)
  if (params.divisionId) query.set('divisionId', params.divisionId)
  if (params.dateRange && params.dateRange !== 'all') query.set('dateRange', params.dateRange)
  if (params.sortBy) query.set('sortBy', params.sortBy)

  const res = await fetch(`/api/action-plans?${query.toString()}`)
  if (res.status === 401 || res.status === 403) {
    const err = new Error('FORBIDDEN') as Error & { status: number }
    err.status = res.status
    throw err
  }
  if (!res.ok) throw new Error('Gagal memuat data')
  const json: { items: ActionPlan[]; total: number } = await res.json()
  return json.items
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
  const [denied, setDenied] = useState(false)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [picFilter, setPicFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [createModalOpen, setCreateModalOpen] = useState(false)
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
      const data = await fetchBoardActionPlans({
        projectId: projectId || undefined,
        priority: priorityFilter || undefined,
        picId: picFilter || undefined,
        divisionId: divisionId || undefined,
        dateRange,
        sortBy,
      })
      setItems(data)
      setError(null)
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403 || e?.message === 'FORBIDDEN') {
        setDenied(true)
      } else {
        setError('Terjadi kesalahan saat memuat data Kanban. Coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, priorityFilter, picFilter, divisionId, dateRange, sortBy])

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
    return (
      items.find((ap) => ap.task?.project?.id === projectId)?.task?.project?.name ??
      'project ini'
    )
  }, [items, projectId])

  const availablePics = useMemo(() => {
    if (!items) return []
    const map = new Map<string, string>()
    for (const ap of items) {
      if (ap.pic?.id && ap.pic?.name) {
        map.set(ap.pic.id, ap.pic.name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [items])

  const scoped = useMemo(() => {
    if (!items) return []
    let rows = items
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (ap) =>
          ap.title.toLowerCase().includes(q) ||
          (ap.code && ap.code.toLowerCase().includes(q)) ||
          (ap.pic?.name && ap.pic.name.toLowerCase().includes(q))
      )
    }
    return rows
  }, [items, search])

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
    const map = new Map<KanbanColumnKey, ActionPlan[]>(
      KANBAN_COLUMNS.map((c) => [c.key, [] as ActionPlan[]])
    )
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
    if (targetColumn === 'REVIEW' || targetColumn === 'NEEDS_REVISION') {
      showToast('Transisi ke kolom ini butuh catatan wajib — gunakan Drawer Detail untuk tiap kartu.')
      return
    }

    // Validasi per-kartu menggunakan resolveKanbanDrop
    const actionsMap: Record<'start' | 'complete' | 'review-complete', string[]> = {
      start: [],
      complete: [],
      'review-complete': [],
    }
    let skippedCount = 0

    for (const id of candidateIds) {
      const ap = items.find((it) => it.id === id)
      if (!ap || columnForStatus(ap.status) === targetColumn) {
        continue
      }
      const action = resolveKanbanDrop(ap, targetColumn, { id: userId, role, divisionId })
      if (action && action.kind !== 'needs-note') {
        actionsMap[action.kind].push(id)
      } else {
        skippedCount++
      }
    }

    const totalValid = actionsMap.start.length + actionsMap.complete.length + actionsMap['review-complete'].length

    if (totalValid === 0) {
      showToast(
        skippedCount > 0
          ? 'Tidak ada kartu terpilih yang memenuhi syarat transisi langsung ke kolom ini.'
          : 'Semua kartu terpilih sudah berada di kolom tujuan.'
      )
      return
    }

    if (skippedCount > 0) {
      showToast(`${skippedCount} kartu tidak memenuhi syarat transisi dan dilewati.`)
    }

    // Eksekusi transisi per jenis aksi yang valid
    for (const [actionKind, ids] of Object.entries(actionsMap) as [('start' | 'complete' | 'review-complete'), string[]][]) {
      if (ids.length > 0) {
        await executeBatchAction(actionKind, ids)
      }
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

  if (denied) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-900/50 shadow-sm p-8 text-center max-w-md mx-auto my-12">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Anda tidak punya akses</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Anda tidak memiliki izin untuk melihat Kanban Board ini.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    )
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
    <div className="space-y-4">
      {/* ── 1. Page Header with Breadcrumb & View Switcher (PRD §B8) ── */}
      <div className="flex flex-col gap-1">
        <nav className="text-xs text-slate-400 flex items-center gap-1.5">
          <span>Workspace</span>
          <span>/</span>
          <span>Execution</span>
          <span>/</span>
          <span className="text-blue-500 font-medium">Board</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Execution Board
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              5 Kolom Kanban terintegrasi 8 status alur kerja • {scoped.length} Action Plans
            </p>
          </div>

          {/* View Switcher & New AP Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <Link
                href="/action-plans"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Tampilan Tabel"
              >
                <LayoutList size={13} />
                Table
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm transition-colors"
                title="Tampilan Board Kanban"
              >
                <LayoutGrid size={13} />
                Board
              </button>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Tampilan Kalender"
              >
                <CalendarDays size={13} />
                Calendar
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
            >
              <Plus size={14} />
              + New Action Plan
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Unified Toolbar: Search, Date Quick Chips, Dropdown Filters, Sort (PRD §B8) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Left: Search input & Date Quick Chips */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul atau kode AP..."
              className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date Range Quick Chips PRD §B8 */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg">
            {[
              { key: 'all', label: 'Semua' },
              { key: 'today', label: 'Hari Ini' },
              { key: 'week', label: 'Minggu Ini' },
              { key: 'month', label: 'Bulan Ini' },
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setDateRange(chip.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  dateRange === chip.key
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Dropdown Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-slate-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Prioritas</option>
              <option value="HIGH">Tinggi (High)</option>
              <option value="MEDIUM">Sedang (Medium)</option>
              <option value="LOW">Rendah (Low)</option>
            </select>
          </div>

          {/* PIC filter (if multiple PICs exist) */}
          {availablePics.length > 0 && (
            <select
              value={picFilter}
              onChange={(e) => setPicFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua PIC ({availablePics.length})</option>
              {availablePics.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Sort By PRD §B8 */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-700">
            <ArrowUpDown size={12} className="text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Terbaru Dibuat</option>
              <option value="oldest">Terlama Dibuat</option>
              <option value="due_asc">Deadline Terdekat</option>
              <option value="due_desc">Deadline Terjauh</option>
              <option value="priority_desc">Prioritas Tertinggi</option>
            </select>
          </div>
        </div>
      </div>

      {projectId && (
        <div className="text-xs text-slate-500 dark:text-slate-400 px-1">
          Difilter untuk program/inisiatif:{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {projectLabel}
          </span>
          {' · '}
          <Link
            href="/board"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Reset filter inisiatif
          </Link>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {items && items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center">
          <p className="text-base font-medium text-slate-800 dark:text-slate-200">Belum ada Action Plan</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Buat Action Plan terlebih dahulu untuk mulai memantau pengerjaan di papan kanban.
          </p>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            Buat Action Plan
          </button>
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
        /* Fluid 5-column CSS grid without horizontal scroll */
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

      <ActionPlanFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        actionPlan={null}
        defaults={{ taskId: null, picId: userId }}
        onSuccess={() => {
          void fetchData()
          showToast('Action Plan baru berhasil dibuat!')
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
  )
}
