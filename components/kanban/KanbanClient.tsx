'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Plus,
  X,
  Kanban,
} from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { KanbanFloatingBar } from '@/components/kanban/KanbanFloatingBar'
import { useKanbanMarquee } from '@/hooks/useKanbanMarquee'
import { edgeScrollVelocity } from '@/lib/edge-scroll'
import { ActionPlanDetail } from '@/components/action-plans/ActionPlanDetail'
import { ActionPlanFormModal } from '@/components/action-plans/ActionPlanFormModal'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { FilterPopover } from '@/components/ui/FilterPopover'
import { ActiveChip } from '@/components/ui/FilterToolbar'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterEmptyState } from '@/components/ui/FilterEmptyState'
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
  dateFrom?: string
  dateTo?: string
  sortBy?: string
}): Promise<ActionPlan[]> {
  const query = new URLSearchParams({ view: 'board' })
  if (params.projectId) query.set('projectId', params.projectId)
  if (params.priority) query.set('priority', params.priority)
  if (params.picId) query.set('picId', params.picId)
  if (params.divisionId) query.set('divisionId', params.divisionId)
  if (params.dateRange && params.dateRange !== 'all') query.set('dateRange', params.dateRange)
  if (params.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params.dateTo) query.set('dateTo', params.dateTo)
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
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [filterOpen, setFilterOpen] = useState(false)
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
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
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
  }, [projectId, priorityFilter, picFilter, divisionId, dateRange, dateFrom, dateTo, sortBy])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  // Auto-scroll tepi viewport selama drag kartu.
  // Chromium di Windows/Linux mengikuti spec HTML DnD: wheel & keyboard
  // di-suppress dari dragstart sampai dragend, jadi halaman tidak bisa digulir
  // saat menyeret kartu ke kolom yang berada di luar layar.
  // ponytail: hanya sumbu Y — grid lg:grid-cols-5 menampilkan 5 kolom tanpa
  // scroll horizontal. Tambah sumbu X kalau board kelak pakai container overflow-x.
  useEffect(() => {
    let velocity = 0
    let frame: number | null = null
    let lastDragOver = 0

    function stop() {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      velocity = 0
      lastDragOver = 0
    }

    function tick() {
      // dragend TIDAK selalu fires (node sumber dicopot dari DOM, Esc di
      // sebagian kondisi). Selama drag hidup, dragover fires terus-menerus —
      // bahkan saat pointer diam. Begitu berhenti fires, dragnya sudah selesai.
      // Pakai itu sebagai tanda hidup, bukan hitungan frame diam: kalau drag
      // putus sementara pointer ada di zona tepi, velocity tetap bukan nol dan
      // halaman akan menggulir selamanya.
      if (performance.now() - lastDragOver > 200) {
        stop()
        return
      }
      if (velocity !== 0) window.scrollBy(0, velocity)
      frame = requestAnimationFrame(tick)
    }

    function handleDragOver(e: DragEvent) {
      lastDragOver = performance.now()
      velocity = edgeScrollVelocity(e.clientY, window.innerHeight)
      // idempoten: satu loop saja walau dragover fires puluhan kali per detik
      if (frame === null) frame = requestAnimationFrame(tick)
    }

    document.addEventListener('dragover', handleDragOver, { passive: true })
    document.addEventListener('dragend', stop)
    document.addEventListener('drop', stop)

    return () => {
      stop()
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragend', stop)
      document.removeEventListener('drop', stop)
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

  // GSAP stagger-in animation for newly rendered kanban cards
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-kanban-card-id]:not([data-animated])')
      if (!cards.length) return
      cards.forEach((c) => c.setAttribute('data-animated', ''))
      gsap.from(cards, {
        y: 12,
        opacity: 0,
        duration: 0.45,
        ease: 'power3.out',
        stagger: { each: 0.035, from: 'start' },
        clearProps: 'all',
      })
    })
    return () => mm.revert()
  }, { scope: boardRef, dependencies: [scoped] })

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
      <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-8 text-center max-w-md mx-auto my-12">
        <h2 className="text-base font-semibold text-foreground">Anda tidak punya akses</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Anda tidak memiliki izin untuk melihat Kanban Board ini.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <div className="h-7 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse mt-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 w-full">
          {KANBAN_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="min-w-0 flex flex-col bg-muted rounded-lg border border-border p-2.5 sm:p-3"
            >
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{col.title}</span>
                <span className="h-4 w-4 rounded-full bg-card animate-pulse" />
              </div>
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-lg bg-card border border-border p-3.5 space-y-2.5 animate-pulse"
                  >
                    <div className="flex justify-between">
                      <div className="h-3.5 w-16 bg-muted rounded" />
                      <div className="h-3.5 w-12 bg-muted rounded" />
                    </div>
                    <div className="h-4 w-4/5 bg-muted rounded" />
                    <div className="h-3 w-1/3 bg-muted rounded" />
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
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualisasi alur pengerjaan Action Plan dalam 5 tahap kanban.
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-5">
          <p className="text-sm text-destructive-text">{error}</p>
          <button
            onClick={() => void fetchData()}
            className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── 1. Page Header (Board|Calendar|Table = SectionTabs di shell) ── */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Execution Board
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              5 Kolom Kanban terintegrasi 8 status alur kerja • {scoped.length} Action Plans
            </p>
          </div>

          {/* New AP Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary hover:bg-primary-hover px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={14} />
              Tambah Action Plan
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Unified Toolbar: Search, Date Quick Chips, Dropdown Filters, Sort (PRD §B8) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border shadow-sm dark:shadow-none">
        {/* Left: Search input & Date Quick Chips */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul atau kode AP..."
              aria-label="Cari Action Plan"
              className="w-full h-8 pl-8 pr-7 rounded-md border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date Range Quick Chips PRD §B8 */}
          <div className="flex flex-wrap items-center gap-1 bg-muted p-0.5 rounded-md">
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
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  dateRange === chip.key
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Filter Popover Button & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Unified Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                filterOpen || (priorityFilter || picFilter || (dateRange !== 'all') || dateFrom || dateTo)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-card text-foreground hover:bg-accent'
              }`}
            >
              <SlidersHorizontal size={13} className="shrink-0" />
              <span>Filter</span>
              {(priorityFilter || picFilter || (dateRange !== 'all') || dateFrom || dateTo) && (
                <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-foreground text-primary px-1 text-xs font-mono tabular-nums font-bold">
                  {(priorityFilter ? 1 : 0) + (picFilter ? 1 : 0) + (dateRange !== 'all' ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)}
                </span>
              )}
            </button>

            <FilterPopover
              isOpen={filterOpen}
              onClose={() => setFilterOpen(false)}
              onApply={(draft) => {
                setPriorityFilter(draft.priorities[0] ?? '')
                setPicFilter(draft.picIds[0] ?? '')
                setDateFrom(draft.dateFrom)
                setDateTo(draft.dateTo)
                if (draft.dateFrom || draft.dateTo) setDateRange('all')
              }}
              initialValues={{
                priorities: priorityFilter ? [priorityFilter] : [],
                picIds: picFilter ? [picFilter] : [],
                dateFrom,
                dateTo,
              }}
              config={{
                statuses: false,
                priorities: [
                  { value: 'HIGH', label: 'Tinggi (High)' },
                  { value: 'MEDIUM', label: 'Sedang (Medium)' },
                  { value: 'LOW', label: 'Rendah (Low)' },
                ],
                pics: availablePics.length > 0 ? availablePics : true,
                dateRange: true,
                divisions: false,
                projects: false,
                entityName: 'Action Plan',
                totalEntities: items?.length ?? 0,
              }}
              totalResults={scoped.length}
              align="right"
            />
          </div>

          {/* Sort By PRD §B8 */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-border">
            <ArrowUpDown size={12} className="text-muted-foreground shrink-0" aria-hidden="true" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Urutkan"
              className="h-8 rounded-md border border-input bg-card px-2.5 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
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

      {/* ── Active Filter Chips Row ── */}
      {(search || priorityFilter || picFilter || (dateRange !== 'all') || dateFrom || dateTo) && (
        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
            FILTER AKTIF:
          </span>

          {search && (
            <ActiveChip
              label={`Keyword: '${search}'`}
              onRemove={() => setSearch('')}
            />
          )}

          {priorityFilter && (
            <ActiveChip
              label={`Prioritas: ${priorityFilter}`}
              dot={priorityFilter === 'HIGH' ? 'bg-red-500' : priorityFilter === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400'}
              onRemove={() => setPriorityFilter('')}
            />
          )}

          {picFilter && (
            <ActiveChip
              label={`PIC: ${availablePics.find((p) => p.id === picFilter)?.name ?? picFilter}`}
              dot="bg-muted-foreground"
              onRemove={() => setPicFilter('')}
            />
          )}

          {dateRange !== 'all' && (
            <ActiveChip
              label={`Periode: ${dateRange === 'today' ? 'Hari Ini' : dateRange === 'week' ? 'Minggu Ini' : 'Bulan Ini'}`}
              dot="bg-amber-500"
              onRemove={() => setDateRange('all')}
            />
          )}

          {(dateFrom || dateTo) && (
            <ActiveChip
              label={`Tanggal: ${dateFrom || '...'} s/d ${dateTo || '...'}`}
              dot="bg-amber-500"
              onRemove={() => {
                setDateFrom('')
                setDateTo('')
              }}
            />
          )}

          <button
            type="button"
            onClick={() => {
              setSearch('')
              setPriorityFilter('')
              setPicFilter('')
              setDateRange('all')
              setDateFrom('')
              setDateTo('')
            }}
            className="text-xs font-semibold text-destructive-text hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
          >
            Hapus semua filter
          </button>
        </div>
      )}

      {projectId && (
        <div className="text-xs text-muted-foreground px-1">
          Difilter untuk program/inisiatif:{' '}
          <span className="font-semibold text-foreground">
            {projectLabel}
          </span>
          {' · '}
          <Link
            href="/board"
            className="text-foreground underline underline-offset-2 hover:no-underline font-medium"
          >
            Reset filter inisiatif
          </Link>
        </div>
      )}

      {error && <p className="text-sm text-destructive-text">{error}</p>}

      {items && items.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Belum ada Action Plan."
          description="Action Plan yang dibuat akan tampil di papan sesuai tahapnya."
          action={{ label: 'Tambah Action Plan', icon: Plus, onClick: () => setCreateModalOpen(true) }}
        />
      ) : scoped.length === 0 ? (
        <div className="bg-card rounded-lg border border-border">
          <FilterEmptyState
            title="Tidak ada Action Plan yang cocok."
            searchKeyword={search || undefined}
            onReset={() => {
              setSearch('')
              setPriorityFilter('')
              setPicFilter('')
              setDateRange('all')
              setDateFrom('')
              setDateTo('')
            }}
          />
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
              className="fixed pointer-events-none z-50 border border-primary bg-primary/15 rounded"
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
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-md rounded-md bg-foreground text-background text-sm font-medium px-4 py-2.5 shadow-lg">
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
