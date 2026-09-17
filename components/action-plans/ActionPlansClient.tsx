'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreHorizontal,
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  LayoutList,
  Kanban,
  Calendar as CalendarIcon,
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
  search?: string
  page: number
  pageSize: number
}): string {
  const qs = new URLSearchParams()
  if (params.statusFilter) qs.set('status', params.statusFilter)
  if (params.priorityFilter) qs.set('priority', params.priorityFilter)
  if (params.divisionFilter) qs.set('divisionId', params.divisionFilter)
  if (params.search) qs.set('search', params.search)
  qs.set('page', String(params.page))
  qs.set('pageSize', String(params.pageSize))
  return qs.toString() ? `?${qs.toString()}` : ''
}

function ActionPlansDeniedState({ onBack }: Readonly<{ onBack: () => void }>) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-900/50 shadow-sm p-8 text-center max-w-md mx-auto">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Anda tidak punya akses</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Anda tidak memiliki izin untuk melihat Action Plan ini.
      </p>
      <button
        onClick={onBack}
        className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
      >
        Kembali ke Beranda
      </button>
    </div>
  )
}

function ActionPlansLoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function ActionPlansErrorState({ error, onRetry }: Readonly<{ error: string; onRetry: () => void }>) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
      <button
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
      >
        Coba lagi
      </button>
    </div>
  )
}

interface ActionPlanTableRowProps {
  ap: ActionPlan
  userId: string
  isSelected: boolean
  isHighlighted: boolean
  onSelect: (ap: ActionPlan) => void
  onEdit: (ap: ActionPlan) => void
}

function ActionPlanTableRow({
  ap,
  userId,
  isSelected,
  isHighlighted,
  onSelect,
  onEdit,
}: Readonly<ActionPlanTableRowProps>) {
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
      className={`border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer transition-colors ${
        isHighlighted
          ? 'bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500 ring-inset'
          : isSelected
            ? 'bg-blue-50/60 dark:bg-blue-500/10'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`w-1 self-stretch rounded-full ${AP_STATUS_DOT[ap.status] ?? 'bg-slate-300'}`}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 dark:text-slate-50">{ap.title}</p>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{ap.code}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          {ap.task?.project?.name ?? (ap.isPersonal ? 'Personal' : '—')}
        </p>
        <p className="max-w-[220px] truncate text-xs text-slate-500 dark:text-slate-400">
          {ap.task?.title ?? ap.division?.name ?? '—'}
        </p>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15 text-xs font-semibold text-blue-700 dark:text-blue-300">
            {initials(ap.pic?.name)}
          </span>
          <span className="text-slate-700 dark:text-slate-300">{ap.picId === userId ? 'Anda' : ap.pic?.name ?? '—'}</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={ap.priority} styleMap={AP_PRIORITY_STYLE} labelMap={AP_PRIORITY_LABEL} />
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${AP_STATUS_DOT[ap.status] ?? 'bg-slate-300'} ${
              ap.status === 'PENDING_APPROVAL' ? 'animate-pulse' : ''
            }`}
          />
          <StatusBadge status={ap.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
        </div>
      </td>
      <td className="px-5 py-3">
        <p
          className={`font-mono text-sm ${
            isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {formatDate(ap.endDate)}
        </p>
      </td>
      <td className="px-5 py-3">
        <div className="w-32">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">
              {ap.checklistDone}/{ap.checklistTotal}
            </span>
            <span className="text-slate-700 dark:text-slate-300">{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-1.5 rounded-full ${
                pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end">
          <button
            type="button"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(ap)
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function ActionPlansClient({
  role,
  userId,
  openCreate,
  initialOpenId,
  initialHighlightId,
  initialDivisionId,
  initialStatus,
}: Readonly<{
  role: Role
  userId: string
  openCreate?: boolean
  initialOpenId?: string
  initialHighlightId?: string
  initialDivisionId?: string
  initialStatus?: string
}>) {
  const router = useRouter()
  const [data, setData] = useState<Ledger | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  // Drill-down dari Laporan: /action-plans?division=…&status=…
  const [divisionFilter, setDivisionFilter] = useState(initialDivisionId ?? '')
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? '')
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
  const [successBanner, setSuccessBanner] = useState<string | null>(null)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showSuccess(msg: string) {
    setSuccessBanner(msg)
    if (bannerTimer.current) clearTimeout(bannerTimer.current)
    bannerTimer.current = setTimeout(() => setSuccessBanner(null), 4000)
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
  }, [statusFilter, priorityFilter, divisionFilter, search, page])

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
    (statusFilter ? 1 : 0) + (priorityFilter ? 1 : 0) + (divisionFilter ? 1 : 0)
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
      {/* ===== Breadcrumb & Header ===== */}
      <nav className="text-xs text-slate-400 flex items-center gap-1.5">
        <span>Workspace</span>
        <span>/</span>
        <span>Execution</span>
        <span>/</span>
        <span className="text-blue-500 font-medium">Action Plans (Table)</span>
      </nav>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Program &amp; Action Plan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tampilan tabel ledger alur kerja operasional • {totalCount} Action Plans
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Switcher: Table | Board | Calendar (PRD §B1, §B8) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700"
              title="Tampilan Tabel (Aktif)"
            >
              <LayoutList size={13} />
              Table
            </button>
            <Link
              href="/board"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Pindah ke Tampilan Board (Kanban)"
            >
              <Kanban size={13} />
              Board
            </Link>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Pindah ke Tampilan Kalender"
            >
              <CalendarIcon size={13} />
              Calendar
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Bulk Paste
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
            title="Import Action Plan dari file CSV (Maksimal 24 item / 6 hari kerja)"
          >
            <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            title="Tekan 'C' di keyboard untuk buat cepat"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Action Plan Baru
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-sans font-medium text-blue-100 bg-blue-600/60 rounded">
              C
            </kbd>
          </button>
        </div>
      </div>

      {/* ===== Chip drill-down dari Laporan ===== */}
      {divisionFilter && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
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
              ? 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className={`text-xs font-medium truncate w-full ${statusFilter === '' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
            Semua
          </span>
          <span className={`text-lg font-semibold leading-none ${statusFilter === '' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-50'}`}>
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
                ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5 min-w-0 w-full">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${AP_STATUS_DOT[s] ?? 'bg-slate-300'} ${
                  s === 'PENDING_APPROVAL' ? 'animate-pulse' : ''
                }`}
              />
              <span
                title={AP_STATUS_LABEL[s]}
                className={`text-xs font-medium truncate ${
                  statusFilter === s ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {AP_STATUS_LABEL[s]}
              </span>
            </span>
            <span
              className={`text-lg font-semibold leading-none ${
                statusFilter === s ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-50'
              }`}
            >
              {data.counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ===== Toolbar ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              aria-label="Cari judul, PIC, atau kode action plan"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul, PIC, kode..."
              className="h-9 w-64 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm font-medium transition-colors ${
                filterOpen || activeFilterCount > 0
                  ? 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute left-0 top-11 z-20 w-64 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Filter</span>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="filter-status-select" className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
                    <select
                      id="filter-status-select"
                      value={statusFilter}
                      onChange={(e) => applyFilter('statusFilter', e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Semua Status</option>
                      {STATUS_FILTERS.map((s) => (
                        <option key={s} value={s}>
                          {AP_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="filter-priority-select" className="text-xs font-medium text-slate-500 dark:text-slate-400">Prioritas</label>
                    <select
                      id="filter-priority-select"
                      value={priorityFilter}
                      onChange={(e) => applyFilter('priorityFilter', e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Semua Prioritas</option>
                      {PRIORITY_FILTERS.map((p) => (
                        <option key={p} value={p}>
                          {AP_PRIORITY_LABEL[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="w-full inline-flex items-center justify-center h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {loading ? 'Memperbarui...' : `${data.total} action plan`}
        </span>
      </div>

      {/* ===== Ledger table ===== */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        {data.items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Tidak ada Action Plan yang cocok dengan filter.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 inline-flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-medium text-white hover:bg-blue-600"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
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
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
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
                />
              ))}
            </tbody>
          </table>
        )}

        {data.items.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan {start} - {end} dari {data.total} action plan
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageWindow(data.page, pages).map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400 dark:text-slate-500">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p as number)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                      p === data.page
                        ? 'bg-blue-500 text-white'
                        : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
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
    </div>
  )
}