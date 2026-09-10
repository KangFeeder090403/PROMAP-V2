'use client'

import { useEffect, useState } from 'react'
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

export function ActionPlansClient({
  role,
  userId,
  openCreate,
  initialOpenId,
  initialHighlightId,
}: {
  role: Role
  userId: string
  openCreate?: boolean
  initialOpenId?: string
  initialHighlightId?: string
}) {
  const router = useRouter()
  const [data, setData] = useState<Ledger | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(
    initialHighlightId ?? initialOpenId ?? null
  )

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ActionPlan | null>(null)
  const [selected, setSelected] = useState<ActionPlan | null>(null)

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
  }, [statusFilter, priorityFilter, search, page])

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
      const qs = new URLSearchParams()
      if (statusFilter) qs.set('status', statusFilter)
      if (priorityFilter) qs.set('priority', priorityFilter)
      if (search) qs.set('search', search)
      qs.set('page', String(page))
      qs.set('pageSize', String(PAGE_SIZE))
      const res = await fetch(`/api/action-plans${qs.toString() ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      const ledger: Ledger = await res.json()
      setData(ledger)
      // Refresh isi drawer sekaligus kalau AP yang dibuka ikut ter-filter.
      setSelected((prev) => (prev ? ledger.items.find((a) => a.id === prev.id) ?? prev : prev))
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const activeFilterCount = (statusFilter ? 1 : 0) + (priorityFilter ? 1 : 0)
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
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  if (loading && !data) return <div className="text-sm text-slate-500 dark:text-slate-400">Memuat...</div>

  if (error && !data) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (!data) return null

  const totalCount = Object.values(data.counts).reduce((s, c) => s + c, 0)
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const start = data.items.length === 0 ? 0 : (data.page - 1) * PAGE_SIZE + 1
  const end = (data.page - 1) * PAGE_SIZE + data.items.length

  return (
    <div className="space-y-4">
      {/* ===== Judul hal ===== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Governance §B · Operational Execution
          </p>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Program Initiatives &amp; Action Plans</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Action Plan Baru
        </button>
      </div>

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
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
                    <select
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
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Prioritas</label>
                    <select
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
              {data.items.map((ap) => {
                const isOverdue =
                  ap.status !== 'COMPLETE' &&
                  new Date(ap.endDate).getTime() < Date.now() - 86400000
                const pct =
                  ap.checklistTotal === 0
                    ? ap.status === 'COMPLETE'
                      ? 100
                      : 0
                    : Math.round((ap.checklistDone / ap.checklistTotal) * 100)
                const isHighlighted = highlightedId === ap.id
                return (
                  <tr
                    key={ap.id}
                    onClick={() => {
                      setSelected(ap)
                      setHighlightedId(ap.id)
                    }}
                    className={`border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500 ring-inset'
                        : selected?.id === ap.id
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
                            setEditing(ap)
                            setFormOpen(true)
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
        onSuccess={() => {
          setFormOpen(false)
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