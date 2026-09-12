'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus } from 'lucide-react'
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
import { FilterToolbar } from '@/components/ui/FilterToolbar'
import { FilterEmptyState } from '@/components/ui/FilterEmptyState'
import { useFilterState } from '@/lib/use-filter-state'

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

// Konfigurasi status untuk FilterToolbar
const FILTER_STATUS_OPTIONS = STATUS_ORDER.map((s) => ({
  value: s,
  label: AP_STATUS_LABEL[s] ?? s,
  dot: AP_STATUS_DOT[s],
}))

const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru dibuat' },
  { value: 'oldest', label: 'Terlama dibuat' },
  { value: 'deadline_asc', label: 'Deadline Terdekat' },
  { value: 'deadline_desc', label: 'Deadline Terjauh' },
  { value: 'priority_desc', label: 'Prioritas Tertinggi' },
]

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
  const filterState = useFilterState(250)

  const [data, setData] = useState<Ledger | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  // Fetch saat filter/sort/page berubah (debouncedSearch sudah stabil)
  useEffect(() => {
    fetchData()
  }, [
    filterState.debouncedSearch,
    filterState.statuses,
    filterState.priorities,
    filterState.divisionIds,
    filterState.picIds,
    filterState.projectId,
    filterState.dateFrom,
    filterState.dateTo,
    filterState.sortBy,
    filterState.page,
  ])

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

      // Multi-value
      filterState.statuses.forEach((s) => qs.append('status', s))
      filterState.priorities.forEach((p) => qs.append('priority', p))
      filterState.divisionIds.forEach((d) => qs.append('divisionId', d))
      filterState.picIds.forEach((p) => qs.append('picId', p))

      if (filterState.projectId) qs.set('projectId', filterState.projectId)
      if (filterState.debouncedSearch) qs.set('search', filterState.debouncedSearch)
      if (filterState.dateFrom) qs.set('dateFrom', filterState.dateFrom)
      if (filterState.dateTo) qs.set('dateTo', filterState.dateTo)
      if (filterState.sortBy) qs.set('sortBy', filterState.sortBy)
      qs.set('page', String(filterState.page))
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
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Governance §B · Operational Execution
        </p>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Program Initiatives & Action Plans</h1>
      </div>

      {/* ===== Chips workflow state ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-9 gap-2">
        <button
          type="button"
          onClick={() => filterState.setStatuses([])}
          className={`flex flex-col justify-between h-[66px] rounded-lg border px-3 py-2 text-left transition-colors ${
            filterState.statuses.length === 0
              ? 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className={`text-xs font-medium truncate w-full ${filterState.statuses.length === 0 ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
            Semua
          </span>
          <span className={`text-lg font-semibold leading-none ${filterState.statuses.length === 0 ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-50'}`}>
            {totalCount}
          </span>
        </button>

        {STATUS_ORDER.map((s) => {
          const isActive = filterState.statuses.includes(s)
          return (
            <button
              key={s}
              type="button"
              onClick={() => filterState.toggleValue('statuses', s)}
              className={`flex flex-col justify-between h-[66px] rounded-lg border px-3 py-2 text-left transition-colors ${
                isActive
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
                    isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {AP_STATUS_LABEL[s]}
                </span>
              </span>
              <span
                className={`text-lg font-semibold leading-none ${
                  isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-50'
                }`}
              >
                {data.counts[s] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* ===== Filter & Sort Toolbar (UI-11) ===== */}
      <FilterToolbar
        filterState={filterState}
        sortOptions={SORT_OPTIONS}
        filterConfig={{
          statuses: FILTER_STATUS_OPTIONS,
          priorities: true,
          divisions: true,
          pics: true,
          projects: true,
          dateRange: true,
          entityName: 'Action Plan',
          totalEntities: totalCount,
        }}
        currentView="table"
        onViewChange={(v) => {
          if (v === 'board') router.push('/board')
          else if (v === 'calendar') router.push('/calendar')
        }}
        totalResults={data.total}
        loading={loading}
        onNew={() => { setEditing(null); setFormOpen(true) }}
        newLabel="Action Plan Baru"
      />

      {/* ===== Ledger table / Empty State ===== */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        {data.items.length === 0 ? (
          <FilterEmptyState
            activeFilterCount={filterState.activeFilterCount}
            searchKeyword={filterState.debouncedSearch || undefined}
            onReset={filterState.resetFilters}
            onRestoreDefaults={filterState.restoreDefaults}
          />
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3">Title & ID</th>
                <th className="px-5 py-3">Project & Scope</th>
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

        {/* Pagination */}
        {data.items.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan {start} - {end} dari {data.total} action plan
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => filterState.setPage(Math.max(1, filterState.page - 1))}
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
                    onClick={() => filterState.setPage(p as number)}
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
                onClick={() => filterState.setPage(Math.min(pages, filterState.page + 1))}
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