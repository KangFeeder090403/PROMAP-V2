'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Trash2,
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  AP_STATUS_STYLE,
  AP_STATUS_LABEL,
  AP_STATUS_DOT,
  AP_PRIORITY_STYLE,
  AP_PRIORITY_LABEL,
} from '@/lib/status-labels'
import { ActionPlanFormModal } from '@/components/action-plans/ActionPlanFormModal'
import { ActionPlanDetail } from '@/components/action-plans/ActionPlanDetail'
import { BulkCreateModal } from '@/components/action-plans/BulkCreateModal'
import { ImportCsvModal } from '@/components/action-plans/ImportCsvModal'
import { InlineQuickAdd } from '@/components/action-plans/InlineQuickAdd'
import { FilterPopover, type FilterDraftValues } from '@/components/ui/FilterPopover'
import { ActiveChip } from '@/components/ui/FilterToolbar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { canDeleteAP } from '@/lib/action-plan-status'

export interface ActionPlan {
  id: string
  code: string
  taskId: string | null
  picId: string
  divisionId: string | null
  companyId: string
  title: string
  outcomeKpi: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: string
  startDate: string
  endDate: string
  isPersonal: boolean
  evaluationNote: string | null
  evidenceLink: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
  pic: { id: string; name: string; role: string } | null
  task: { id: string; title: string; project: { id: string; name: string } | null } | null
  division: { id: string; name: string } | null
  commentCount: number
  checklistDone: number
  checklistTotal: number
}

interface Ledger {
  items: ActionPlan[]
  counts: Record<string, number>
  total: number
  page: number
  pageSize: number
}

// Urutan chip workflow state — menyelaraskan 8 state enum ActionPlanStatus
// dengan urutan siklus ledger UI-6 (referensi M3, diterjemahkan ke token ProMaP).
const STATUS_ORDER = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'EVIDENCE_REQUIRED',
  'OVERDUE',
  'REJECTED',
  'COMPLETE',
  'APPROVED',
]

const STATUS_FILTERS = STATUS_ORDER
const PRIORITY_FILTERS = ['HIGH', 'MEDIUM', 'LOW'] as const

const PAGE_SIZE = 10

function initials(name?: string | null) {
  return (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID')
}

function pageWindow(current: number, pages: number) {
  if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, 4, '…', pages]
  if (current >= pages - 2) return [1, '…', pages - 3, pages - 2, pages - 1, pages]
  return [1, '…', current - 1, current, current + 1, '…', pages]
}

function isCreateHotkeyTriggered(e: KeyboardEvent, isModalOpen: boolean): boolean {
  if (e.key.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey) {
    return false
  }
  const target = e.target as HTMLElement | null
  const isInput =
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.tagName === 'SELECT' ||
    Boolean(target?.isContentEditable)
  return !isInput && !isModalOpen
}

function buildActionPlansQueryString(params: {
  statusFilter?: string
  priorityFilter?: string
  divisionFilter?: string
  picFilter?: string
  search?: string
  page: number
  pageSize: number
}): string {
  const qs = new URLSearchParams()
  if (params.statusFilter) qs.set('status', params.statusFilter)
  if (params.priorityFilter) qs.set('priority', params.priorityFilter)
  if (params.divisionFilter) qs.set('divisionId', params.divisionFilter)
  if (params.picFilter) qs.set('picId', params.picFilter)
  if (params.search) qs.set('search', params.search)
  qs.set('page', String(params.page))
  qs.set('pageSize', String(params.pageSize))
  return qs.toString() ? `?${qs.toString()}` : ''
}

function ActionPlansDeniedState({ onBack }: Readonly<{ onBack: () => void }>) {
  return (
    <div className="bg-card rounded-lg border border-destructive/30 shadow-sm p-8 text-center max-w-md mx-auto">
      <h2 className="text-base font-semibold text-foreground">Anda tidak punya akses</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Anda tidak memiliki izin untuk melihat Action Plan ini.
      </p>
      <button
        onClick={onBack}
        className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors"
      >
        Kembali ke Beranda
      </button>
    </div>
  )
}

function ActionPlansLoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="bg-card rounded-lg border border-border p-5 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function ActionPlansErrorState({ error, onRetry }: Readonly<{ error: string; onRetry: () => void }>) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-5">
      <p className="text-sm text-fg-secondary">{error}</p>
      <button
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors"
      >
        Coba lagi
      </button>
    </div>
  )
}

interface ActionPlanTableRowProps {
  ap: ActionPlan
  userId: string
  userRole: Role
  userDivisionId: string | null
  isSelected: boolean
  isHighlighted: boolean
  onSelect: (ap: ActionPlan) => void
  onEdit: (ap: ActionPlan) => void
  onDelete: (ap: ActionPlan) => void
}

function ActionPlanTableRow({
  ap,
  userId,
  userRole,
  userDivisionId,
  isSelected,
  isHighlighted,
  onSelect,
  onEdit,
  onDelete,
}: Readonly<ActionPlanTableRowProps>) {
  const canDelete = canDeleteAP({ id: userId, role: userRole, divisionId: userDivisionId }, ap)
  const isOverdue =
    ap.status !== 'COMPLETE' &&
    new Date(ap.endDate).getTime() < Date.now() - 86400000
  const pct =
    ap.checklistTotal === 0
      ? ap.status === 'COMPLETE'
        ? 100
        : 0
      : Math.round((ap.checklistDone / ap.checklistTotal) * 100)

  return (
    <tr
      key={ap.id}
      onClick={() => onSelect(ap)}
      className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
        isHighlighted
          ? 'bg-primary/10 ring-2 ring-primary ring-inset'
          : isSelected
            ? 'bg-primary/5'
            : 'hover:bg-muted'
      }`}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`w-1 self-stretch rounded-full ${AP_STATUS_DOT[ap.status] ?? 'bg-muted-foreground'}`}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{ap.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{ap.code}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <p className="font-medium text-fg-secondary">
          {ap.task?.project?.name ?? (ap.isPersonal ? 'Personal' : '—')}
        </p>
        <p className="max-w-[220px] truncate text-xs text-muted-foreground">
          {ap.task?.title ?? ap.division?.name ?? '—'}
        </p>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-fg-secondary">
            {initials(ap.pic?.name)}
          </span>
          <span className="text-fg-secondary">{ap.picId === userId ? 'Anda' : ap.pic?.name ?? '—'}</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={ap.priority} styleMap={AP_PRIORITY_STYLE} labelMap={AP_PRIORITY_LABEL} />
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${AP_STATUS_DOT[ap.status] ?? 'bg-muted-foreground'} ${
              ap.status === 'PENDING_APPROVAL' ? 'animate-pulse' : ''
            }`}
          />
          <StatusBadge status={ap.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
        </div>
      </td>
      <td className="px-5 py-3">
        <p
          className={`font-mono text-sm ${
            isOverdue ? 'text-destructive-text' : 'text-fg-secondary'
          }`}
        >
          {formatDate(ap.endDate)}
        </p>
      </td>
      <td className="px-5 py-3">
        <div className="w-32">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">
              {ap.checklistDone}/{ap.checklistTotal}
            </span>
            <span className="text-fg-secondary">{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
            <div
              className={`h-1.5 rounded-full ${
                pct >= 100 ? 'bg-emerald-500' : 'bg-chart-1'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(ap)
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {canDelete && (
            <button
              type="button"
              title="Hapus"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(ap)
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive-text"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export function ActionPlansClient({
  role,
  userId,
  userDivisionId,
  openCreate,
  initialOpenId,
  initialHighlightId,
  initialDivisionId,
  initialStatus,
  initialPicId,
}: Readonly<{
  role: Role
  userId: string
  userDivisionId: string | null
  openCreate?: boolean
  initialOpenId?: string
  initialHighlightId?: string
  initialDivisionId?: string
  initialStatus?: string
  initialPicId?: string
}>) {
  const router = useRouter()
  const [data, setData] = useState<Ledger | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  // Drill-down dari Laporan: /action-plans?division=…&status=…
  const [divisionFilter, setDivisionFilter] = useState(initialDivisionId ?? '')
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? '')
  // Drill-down dari Analisis Kontributor (Home): /action-plans?pic=…
  const [picFilter, setPicFilter] = useState(initialPicId ?? '')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(
    initialHighlightId ?? initialOpenId ?? null
  )

  const [formOpen, setFormOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<ActionPlan | null>(null)
  const [selected, setSelected] = useState<ActionPlan | null>(null)
  const [deletingAp, setDeletingAp] = useState<ActionPlan | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showSuccess(msg: string) {
    setSuccessBanner(msg)
    if (bannerTimer.current) clearTimeout(bannerTimer.current)
    bannerTimer.current = setTimeout(() => setSuccessBanner(null), 4000)
  }

  async function handleConfirmDelete() {
    if (!deletingAp) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/action-plans/${deletingAp.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Gagal menghapus Action Plan')
        return
      }
      if (selected?.id === deletingAp.id) setSelected(null)
      showSuccess(`Action Plan "${deletingAp.title}" berhasil dihapus.`)
      setDeletingAp(null)
      await fetchData()
    } catch {
      setError('Terjadi kesalahan jaringan saat menghapus Action Plan.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Global Hotkey: 'c' or 'C' opens create modal when not typing in inputs
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isModalOpen = formOpen || bulkOpen || importOpen || Boolean(selected)
      if (isCreateHotkeyTriggered(e, isModalOpen)) {
        e.preventDefault()
        setEditing(null)
        setFormOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (bannerTimer.current) clearTimeout(bannerTimer.current)
    }
  }, [formOpen, bulkOpen, importOpen, selected])

  // Buka detail jika diakses lewat deep-link ?open=id
  useEffect(() => {
    if (!initialOpenId) return
    fetch(`/api/action-plans/${initialOpenId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((ap) => {
        if (ap) {
          setSelected(ap)
          setHighlightedId(ap.id)
        }
      })
      .catch(() => {})
  }, [initialOpenId])

  // Debounce pencarian — server-side search.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    fetchData()
  }, [statusFilter, priorityFilter, divisionFilter, picFilter, search, page])

  // Header "+ New > Action Plan" mengarah ke /action-plans?new=1. Buka modal,
  // lalu bersihkan param pakai replace supaya back/refresh tidak membukanya lagi.
  useEffect(() => {
    if (!openCreate) return
    setEditing(null)
    setFormOpen(true)
    router.replace('/action-plans', { scroll: false })
  }, [openCreate])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const queryString = buildActionPlansQueryString({
        statusFilter,
        priorityFilter,
        divisionFilter,
        picFilter,
        search,
        page,
        pageSize: PAGE_SIZE,
      })
      const res = await fetch(`/api/action-plans${queryString}`)
      if (res.status === 401 || res.status === 403) {
        setDenied(true)
        return
      }
      if (!res.ok) throw new Error('Gagal memuat data')
      const ledger: Ledger = await res.json()
      setData(ledger)
      setError(null)
      // Refresh isi drawer sekaligus kalau AP yang dibuka ikut ter-filter.
      setSelected((prev) => (prev ? ledger.items.find((a) => a.id === prev.id) ?? prev : prev))
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const activeFilterCount =
    (statusFilter ? 1 : 0) + (priorityFilter ? 1 : 0) + (divisionFilter ? 1 : 0) + (picFilter ? 1 : 0)
  const fieldsDefined = ['statusFilter', 'priorityFilter', 'search', 'page'] as const

  function applyFilter(kind: (typeof fieldsDefined)[number], value: string) {
    setFilterOpen(false)
    if (kind === 'statusFilter') setStatusFilter(value)
    if (kind === 'priorityFilter') setPriorityFilter(value)
    setPage(1)
  }

  function resetFilters() {
    setStatusFilter('')
    setPriorityFilter('')
    setDivisionFilter('')
    setPicFilter('')
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  if (denied) {
    return <ActionPlansDeniedState onBack={() => router.push('/')} />
  }

  if (loading && !data) {
    return <ActionPlansLoadingState />
  }

  if (error && !data) {
    return <ActionPlansErrorState error={error} onRetry={fetchData} />
  }

  if (!data) return null

  const totalCount = Object.values(data.counts).reduce((s, c) => s + c, 0)
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const start = data.items.length === 0 ? 0 : (data.page - 1) * PAGE_SIZE + 1
  const end = (data.page - 1) * PAGE_SIZE + data.items.length

  return (
    <div className="space-y-4">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Program &amp; Action Plan
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tampilan tabel ledger alur kerja operasional • {totalCount} Action Plans
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-card hover:bg-accent text-foreground text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Bulk Paste
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-card hover:bg-accent text-foreground text-sm font-medium transition-colors"
            title="Import Action Plan dari file CSV (Maksimal 24 item / 6 hari kerja)"
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            title="Tekan 'C' di keyboard untuk buat cepat"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Action Plan Baru
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-sans font-medium text-primary-foreground bg-primary-foreground/20 rounded">
              C
            </kbd>
          </button>
        </div>
      </div>

      {/* ===== Chip drill-down dari Laporan ===== */}
      {divisionFilter && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border text-xs text-foreground">
          <span>
            Menampilkan divisi{' '}
            <strong>{data.items[0]?.division?.name ?? 'terpilih'}</strong>
          </span>
          <button
            onClick={() => {
              setDivisionFilter('')
              setPage(1)
              router.replace('/action-plans', { scroll: false })
            }}
            className="font-medium underline hover:no-underline"
          >
            Tampilkan semua
          </button>
        </div>
      )}

      {/* ===== Success micro-banner ===== */}
      {successBanner && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ===== Chips workflow state ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-9 gap-2">
        <button
          type="button"
          onClick={() => applyFilter('statusFilter', '')}
          className={`flex flex-col justify-between h-[66px] rounded-lg border px-3 py-2 text-left transition-colors ${
            statusFilter === ''
              ? 'border-primary/30 bg-primary/10'
              : 'border-border bg-card hover:bg-muted'
          }`}
        >
          <span className={`text-xs font-medium truncate w-full ${statusFilter === '' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Semua
          </span>
          <span className="text-lg font-semibold leading-none text-foreground">
            {totalCount}
          </span>
        </button>

        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => applyFilter('statusFilter', statusFilter === s ? '' : s)}
            className={`flex flex-col justify-between h-[66px] rounded-lg border px-3 py-2 text-left transition-colors ${
              statusFilter === s
                ? 'border-primary/30 bg-primary/10'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <span className="flex items-center gap-1.5 min-w-0 w-full">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${AP_STATUS_DOT[s] ?? 'bg-muted-foreground'} ${
                  s === 'PENDING_APPROVAL' ? 'animate-pulse' : ''
                }`}
              />
              <span
                title={AP_STATUS_LABEL[s]}
                className={`text-xs font-medium truncate ${
                  statusFilter === s ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {AP_STATUS_LABEL[s]}
              </span>
            </span>
            <span className="text-lg font-semibold leading-none text-foreground">
              {data.counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ===== Toolbar ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              aria-label="Cari judul, PIC, atau kode action plan"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul, PIC, kode..."
              className="h-9 w-64 rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm font-semibold transition-colors cursor-pointer ${
                filterOpen || activeFilterCount > 0
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-card text-foreground hover:bg-accent'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              Filter
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-foreground text-primary px-1 text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <FilterPopover
              isOpen={filterOpen}
              onClose={() => setFilterOpen(false)}
              onApply={(draft) => {
                setStatusFilter(draft.statuses[0] ?? '')
                setPriorityFilter(draft.priorities[0] ?? '')
                setDivisionFilter(draft.divisionIds[0] ?? '')
                setPage(1)
              }}
              initialValues={{
                statuses: statusFilter ? [statusFilter] : [],
                priorities: priorityFilter ? [priorityFilter] : [],
                divisionIds: divisionFilter ? [divisionFilter] : [],
              }}
              config={{
                statuses: STATUS_ORDER.map((s) => ({
                  value: s,
                  label: AP_STATUS_LABEL[s] ?? s,
                  dot: AP_STATUS_DOT[s],
                })),
                priorities: PRIORITY_FILTERS.map((p) => ({
                  value: p,
                  label: AP_PRIORITY_LABEL[p] ?? p,
                })),
                divisions: true,
                pics: false,
                projects: false,
                dateRange: false,
                entityName: 'Action Plan',
                totalEntities: data.total,
              }}
              totalResults={data.total}
            />
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {loading ? 'Memperbarui...' : `${data.total} action plan`}
        </span>
      </div>

      {/* ===== Active Filter Chips Row ===== */}
      {(activeFilterCount > 0 || search) && (
        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
            FILTER AKTIF:
          </span>

          {search && (
            <ActiveChip
              label={`Keyword: '${search}'`}
              onRemove={() => {
                setSearch('')
                setSearchInput('')
                setPage(1)
              }}
            />
          )}

          {statusFilter && (
            <ActiveChip
              label={`Status: ${AP_STATUS_LABEL[statusFilter] ?? statusFilter}`}
              dot={AP_STATUS_DOT[statusFilter]}
              onRemove={() => {
                setStatusFilter('')
                setPage(1)
              }}
            />
          )}

          {priorityFilter && (
            <ActiveChip
              label={`Prioritas: ${AP_PRIORITY_LABEL[priorityFilter] ?? priorityFilter}`}
              onRemove={() => {
                setPriorityFilter('')
                setPage(1)
              }}
            />
          )}

          {divisionFilter && (
            <ActiveChip
              label={`Divisi: ${data.items[0]?.division?.name ?? 'Terpilih'}`}
              dot="bg-teal-500"
              onRemove={() => {
                setDivisionFilter('')
                setPage(1)
              }}
            />
          )}

          {picFilter && (
            // ponytail: nama diambil dari baris pertama; tambah lookup nama bila hasil kosong sering terjadi
            <ActiveChip
              label={`PIC: ${data.items[0]?.pic?.name ?? 'Terpilih'}`}
              onRemove={() => {
                setPicFilter('')
                setPage(1)
              }}
            />
          )}

          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold text-destructive-text hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
          >
            Hapus semua filter
          </button>
        </div>
      )}

      {/* ===== Ledger table ===== */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-x-auto">
        {data.total === 0 && !search && !statusFilter && !priorityFilter && !divisionFilter && !picFilter ? (
          <EmptyState
            icon={CheckCircle2}
            title="Belum ada Action Plan"
            description="Mulai susun rencana kerja dan target eksekusi tim Anda untuk mencapai sasaran inisiatif program kerja."
            action={{
              label: 'Buat Action Plan Baru',
              icon: Plus,
              onClick: () => {
                setEditing(null)
                setFormOpen(true)
              },
            }}
          />
        ) : data.items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground">Tidak ada Action Plan yang cocok dengan filter.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="px-5 py-3">Title &amp; ID</th>
                <th className="px-5 py-3">Project &amp; Scope</th>
                <th className="px-5 py-3">PIC Assignee</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Deadline</th>
                <th className="px-5 py-3">Progress</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Quick Inline Add Row */}
              <tr className="border-b border-border bg-muted/50">
                <td colSpan={8} className="px-5 py-2">
                  <InlineQuickAdd
                    placeholder="Tambah cepat: ketik judul action plan lalu tekan Enter..."
                    buttonText="+ Tambah Action Plan Cepat (Inline)"
                    onAdd={async (quickTitle) => {
                      try {
                        const res = await fetch('/api/action-plans/bulk', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            items: [{ title: quickTitle, outcomeKpi: quickTitle }],
                          }),
                        })
                        if (!res.ok) {
                          const errData = await res.json().catch(() => ({}))
                          setError(errData.error || 'Gagal menambahkan Action Plan')
                          return false
                        }
                        const createdData = await res.json()
                        const createdId = createdData?.items?.[0]?.id
                        if (createdId) setHighlightedId(createdId)
                        showSuccess(`Action Plan "${quickTitle}" berhasil ditambahkan!`)
                        await fetchData()
                      } catch {
                        setError('Terjadi kesalahan jaringan saat menambahkan Action Plan.')
                        return false
                      }
                    }}
                  />
                </td>
              </tr>
              {data.items.map((ap) => (
                <ActionPlanTableRow
                  key={ap.id}
                  ap={ap}
                  userId={userId}
                  userRole={role}
                  userDivisionId={userDivisionId}
                  isSelected={selected?.id === ap.id}
                  isHighlighted={highlightedId === ap.id}
                  onSelect={(selectedAp) => {
                    setSelected(selectedAp)
                    setHighlightedId(selectedAp.id)
                  }}
                  onEdit={(editingAp) => {
                    setEditing(editingAp)
                    setFormOpen(true)
                  }}
                  onDelete={(apToDelete) => setDeletingAp(apToDelete)}
                />
              ))}
            </tbody>
          </table>
        )}

        {data.items.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">
              Menampilkan {start} - {end} dari {data.total} action plan
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-secondary hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageWindow(data.page, pages).map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p as number)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                      p === data.page
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border text-fg-secondary hover:bg-muted'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={data.page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-secondary hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ActionPlanFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        actionPlan={editing}
        onSuccess={(keepOpen) => {
          if (!keepOpen) setFormOpen(false)
          showSuccess(editing ? 'Action Plan berhasil diperbarui!' : 'Action Plan berhasil dibuat!')
          fetchData()
        }}
      />

      <BulkCreateModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        currentUserId={userId}
        userRole={role}
        onSuccess={(count) => {
          showSuccess(`${count} Action Plan berhasil dibuat secara massal!`)
          fetchData()
        }}
      />

      <ImportCsvModal
        open={importOpen}
        onOpenChange={setImportOpen}
        currentUserId={userId}
        userRole={role}
        onSuccess={(count) => {
          showSuccess(`${count} Action Plan berhasil diimpor dari CSV ke database!`)
          fetchData()
        }}
      />

      <ActionPlanDetail
        actionPlan={selected}
        role={role}
        userId={userId}
        onOpenChange={(open) => !open && setSelected(null)}
        onChanged={() => {
          fetchData()
        }}
        onEdit={() => {
          if (!selected) return
          setEditing(selected)
          setFormOpen(true)
        }}
      />

      <ConfirmDialog
        open={deletingAp !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeletingAp(null)
        }}
        title="Hapus Action Plan?"
        message={`"${deletingAp?.title ?? ''}" akan dihapus dari daftar. Riwayat aktivitasnya tetap tersimpan untuk audit.`}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />
    </div>
  )
}