'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  SlidersHorizontal,
  AlarmClock,
  Flag,
  RefreshCw,
  CalendarDays,
  AlertTriangle,
  Clock,
  X,
  Plus,
  PanelRight,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { FilterPopover } from '@/components/ui/FilterPopover'
import { ActiveChip } from '@/components/ui/FilterToolbar'
import {
  getMonthGrid,
  computeWeekSegments,
  fmtISO,
  resolveCalendarRange,
  type CalendarEvent,
  type CalendarViewMode,
} from '@/lib/calendar-grid'
import { AP_STATUS_LABEL, AP_STATUS_DOT, AP_STATUS_BAR_COLOR } from '@/lib/status-labels'

const CalendarEventModal = dynamic(
  () => import('@/components/calendar/CalendarEventModal').then((m) => m.CalendarEventModal),
  { ssr: false }
)
const CalendarDayEventsModal = dynamic(
  () => import('@/components/calendar/CalendarDayEventsModal').then((m) => m.CalendarDayEventsModal),
  { ssr: false }
)
const ActionPlanFormModal = dynamic(
  () => import('@/components/action-plans/ActionPlanFormModal').then((m) => m.ActionPlanFormModal),
  { ssr: false }
)
const CalendarWeekView = dynamic(
  () => import('@/components/calendar/CalendarWeekView').then((m) => m.CalendarWeekView),
  { ssr: false }
)
const CalendarAgendaView = dynamic(
  () => import('@/components/calendar/CalendarAgendaView').then((m) => m.CalendarAgendaView),
  { ssr: false }
)

/* ─── constants ─────────────────────────────────────────────── */
const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export interface FilterOptions {
  statuses: { key: string; label: string }[]
  priorities: { key: string; label: string }[]
  pics: { id: string; name: string; division?: { name: string } | null }[]
  projects: { id: string; name: string }[]
  divisions: { id: string; name: string }[]
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function deadlineLabel(daysLeft: number): { text: string; className: string } {
  if (daysLeft < 0) return { text: `${Math.abs(daysLeft)} Hari Lalu`, className: 'text-destructive-text font-semibold' }
  if (daysLeft === 0) return { text: 'Besok, 23 Jam', className: 'text-destructive-text font-semibold' }
  if (daysLeft <= 3) return { text: `${daysLeft} Hari Lagi`, className: 'text-orange-700 dark:text-orange-300 font-semibold' }
  return {
    text: new Date(Date.now() + daysLeft * 86_400_000).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    className: 'text-muted-foreground',
  }
}

export function CalendarClient({
  initialEvents,
  initialFilterOptions,
}: {
  initialEvents?: CalendarEvent[]
  initialFilterOptions?: FilterOptions
} = {}) {
  const router = useRouter()

  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [events, setEvents] = useState<CalendarEvent[] | null>(initialEvents ?? null)
  const [loading, setLoading] = useState(!initialEvents)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [overflowDate, setOverflowDate] = useState<Date | null>(null)

  // Dynamic filter state
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(initialFilterOptions ?? null)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPic, setSelectedPic] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const initialFetchSkipped = useRef(Boolean(initialEvents))

  const statusLabelMap = useMemo(() => {
    return Object.fromEntries((filterOptions?.statuses ?? []).map((s) => [s.key, s.label]))
  }, [filterOptions?.statuses])

  const picNameMap = useMemo(() => {
    return Object.fromEntries((filterOptions?.pics ?? []).map((p) => [p.id, p.name]))
  }, [filterOptions?.pics])

  const projectNameMap = useMemo(() => {
    return Object.fromEntries((filterOptions?.projects ?? []).map((pr) => [pr.id, pr.name]))
  }, [filterOptions?.projects])

  const priorityLabelMap = useMemo(() => {
    return Object.fromEntries((filterOptions?.priorities ?? []).map((pr) => [pr.key, pr.label]))
  }, [filterOptions?.priorities])

  const activeFilterCount =
    (selectedStatus ? 1 : 0) +
    (selectedPic ? 1 : 0) +
    (selectedProject ? 1 : 0) +
    (selectedPriority ? 1 : 0)

  // Create Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(() => new Date())

  // Load dynamic filter options from API if not pre-fetched
  useEffect(() => {
    if (!initialFilterOptions) {
      fetch('/api/calendar/filters')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setFilterOptions(data)
        })
        .catch((err) => console.error('Gagal memuat opsi filter kalender:', err))
    }
  }, [initialFilterOptions])

  const weeks = useMemo(() => getMonthGrid(anchorDate), [anchorDate])

  // Hitung rentang query berdasarkan viewMode secara deterministik
  const queryRange = useMemo(() => {
    return resolveCalendarRange(viewMode, anchorDate)
  }, [viewMode, anchorDate])

  // Events pada tanggal overflow yang diklik
  const overflowEvents = useMemo(() => {
    if (!overflowDate || !events) return []
    const dStr = fmtISO(overflowDate)
    return events.filter((e) => {
      const sStr = e.startDate.slice(0, 10)
      const eStr = e.endDate.slice(0, 10)
      return dStr >= sStr && dStr <= eStr
    })
  }, [overflowDate, events])

  const fetchEvents = useCallback(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('from', queryRange.from)
    params.set('to', queryRange.to)
    if (selectedStatus) params.set('status', selectedStatus)
    if (selectedPic) params.set('picId', selectedPic)
    if (selectedProject) params.set('projectId', selectedProject)
    if (selectedPriority) params.set('priority', selectedPriority)

    fetch(`/api/calendar?${params.toString()}`)
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          setDenied(true)
          return null
        }
        if (!r.ok) throw new Error('Gagal memuat data kalender')
        return r.json()
      })
      .then((data) => {
        if (data) {
          setEvents(data)
          setLastRefreshed(new Date())
          setError(null)
        }
      })
      .catch(() => setError('Terjadi kesalahan. Coba lagi.'))
      .finally(() => setLoading(false))
  }, [queryRange, selectedStatus, selectedPic, selectedProject, selectedPriority])

  useEffect(() => {
    if (initialFetchSkipped.current) {
      initialFetchSkipped.current = false
      return
    }
    fetchEvents()
  }, [fetchEvents])

  function goPrev() {
    setAnchorDate((prev) => {
      const d = new Date(prev)
      if (viewMode === 'month') d.setMonth(d.getMonth() - 1)
      else if (viewMode === 'week') d.setDate(d.getDate() - 7)
      else d.setDate(d.getDate() - 1)
      return d
    })
  }

  function goNext() {
    setAnchorDate((prev) => {
      const d = new Date(prev)
      if (viewMode === 'month') d.setMonth(d.getMonth() + 1)
      else if (viewMode === 'week') d.setDate(d.getDate() + 7)
      else d.setDate(d.getDate() + 1)
      return d
    })
  }

  function goToday() {
    setAnchorDate(new Date())
  }

  const today = new Date()

  // Label periode dinamis adaptif terhadap viewMode
  const periodLabel = useMemo(() => {
    if (viewMode === 'month') {
      return anchorDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    }
    if (viewMode === 'week') {
      const week = getMonthGrid(anchorDate)[0] // anchor range
      const fromD = new Date(queryRange.from)
      const toD = new Date(queryRange.to)
      return `${fromD.getDate()} ${fromD.toLocaleDateString('id-ID', { month: 'short' })} – ${toD.getDate()} ${toD.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`
    }
    // viewMode === 'day'
    return anchorDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }, [viewMode, anchorDate, queryRange])

  // PDF Export link selaras dengan query aktif
  const exportHref = useMemo(() => {
    const params = new URLSearchParams()
    params.set('from', queryRange.from)
    params.set('to', queryRange.to)
    if (selectedStatus) params.set('status', selectedStatus)
    if (selectedPic) params.set('picId', selectedPic)
    if (selectedProject) params.set('projectId', selectedProject)
    if (selectedPriority) params.set('priority', selectedPriority)
    return `/api/calendar/export?${params.toString()}`
  }, [queryRange, selectedStatus, selectedPic, selectedProject, selectedPriority])

  const totalPlans = events?.length ?? 0
  const overduePlans = events?.filter((e) => e.status === 'OVERDUE').length ?? 0
  const donePlans = events?.filter((e) => e.status === 'COMPLETE' || e.status === 'APPROVED').length ?? 0

  const upcomingDeadlines = useMemo(() => {
    if (!events) return []
    return events
      .filter((e) => {
        const d = diffDays(today, new Date(e.endDate))
        return d <= 7
      })
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(0, 5)
  }, [events])

  const milestoneTotal = totalPlans
  const milestoneDone = donePlans
  const milestonePct = milestoneTotal > 0 ? Math.round((milestoneDone / milestoneTotal) * 100) : 0

  const isAtToday = fmtISO(anchorDate) === fmtISO(today)

  if (denied) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-8 text-center max-w-md mx-auto my-12">
        <h2 className="text-base font-semibold text-foreground">Anda tidak punya akses</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Anda tidak memiliki izin untuk melihat kalender jadwal ini.
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

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Execution Calendar &amp; Schedule
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visualisasi jadwal komitmen kerja, deadline Action Plan, dan jadwal tim lintas divisi
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSidebar((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors shadow-sm dark:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              title={showSidebar ? 'Tutup Panel Samping' : 'Buka Panel Samping'}
            >
              <PanelRight size={13} aria-hidden="true" className={showSidebar ? 'text-foreground' : 'text-muted-foreground'} />
              <span>{showSidebar ? 'Tutup Panel' : 'Buka Panel'}</span>
            </button>
            <a
              href={exportHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors shadow-sm dark:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download size={13} aria-hidden="true" />
              Export PDF Schedule
            </a>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary hover:bg-primary-hover px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={13} aria-hidden="true" />
              Tambah Action Plan
            </button>
          </div>
        </div>
      </div>

      {/* View Mode & Quick Date Range */}
      <div className="flex flex-wrap items-center gap-2 bg-card rounded-lg border border-border p-2 shadow-sm dark:shadow-none">
        {/* View Mode Switcher (Bulan | Minggu | Hari) */}
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5">
          {(
            [
              { key: 'month', label: 'Bulan' },
              { key: 'week', label: 'Minggu' },
              { key: 'day', label: 'Hari / Agenda' },
            ] as { key: CalendarViewMode; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewMode(key)}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                viewMode === key
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Filter Toolbar (§B8, §C1 #14) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted border border-border rounded-lg px-2.5 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Unified Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-2 h-8 px-3 rounded-md border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                filterOpen || activeFilterCount > 0
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-card text-foreground hover:bg-accent'
              }`}
            >
              <SlidersHorizontal size={13} className="shrink-0" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-foreground text-primary px-1 text-xs font-mono tabular-nums font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <FilterPopover
              isOpen={filterOpen}
              onClose={() => setFilterOpen(false)}
              onApply={(draft) => {
                setSelectedStatus(draft.statuses[0] ?? '')
                setSelectedPic(draft.picIds[0] ?? '')
                setSelectedProject(draft.projectId ?? '')
                setSelectedPriority(draft.priorities[0] ?? '')
              }}
              initialValues={{
                statuses: selectedStatus ? [selectedStatus] : [],
                picIds: selectedPic ? [selectedPic] : [],
                projectId: selectedProject,
                priorities: selectedPriority ? [selectedPriority] : [],
              }}
              config={{
                statuses:
                  filterOptions?.statuses.map((s) => ({
                    value: s.key,
                    label: s.label,
                    dot: AP_STATUS_DOT[s.key],
                  })) ?? [],
                pics:
                  filterOptions?.pics.map((p) => ({
                    id: p.id,
                    name: p.name,
                    division: p.division,
                  })) ?? [],
                projects: filterOptions?.projects ?? [],
                priorities:
                  filterOptions?.priorities.map((pr) => ({
                    value: pr.key,
                    label: pr.label,
                  })) ?? [],
                dateRange: false,
                divisions: false,
                entityName: 'Rencana Aksi',
                totalEntities: events?.length ?? 0,
              }}
              totalResults={events?.length ?? 0}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter size={12} aria-hidden="true" />
          Showing {totalPlans} Active Plans
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
            FILTER AKTIF:
          </span>

          {selectedStatus && (
            <ActiveChip
              label={`Status: ${statusLabelMap[selectedStatus] ?? selectedStatus}`}
              dot={AP_STATUS_DOT[selectedStatus]}
              onRemove={() => setSelectedStatus('')}
            />
          )}

          {selectedPic && (
            <ActiveChip
              label={`PIC: ${picNameMap[selectedPic] ?? selectedPic}`}
              dot="bg-muted-foreground"
              onRemove={() => setSelectedPic('')}
            />
          )}

          {selectedProject && (
            <ActiveChip
              label={`Proyek: ${projectNameMap[selectedProject] ?? selectedProject}`}
              dot="bg-muted-foreground"
              onRemove={() => setSelectedProject('')}
            />
          )}

          {selectedPriority && (
            <ActiveChip
              label={`Prioritas: ${priorityLabelMap[selectedPriority] ?? selectedPriority}`}
              dot="bg-muted-foreground"
              onRemove={() => setSelectedPriority('')}
            />
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedStatus('')
              setSelectedPic('')
              setSelectedProject('')
              setSelectedPriority('')
            }}
            className="text-xs font-semibold text-destructive-text hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
          >
            Hapus semua filter
          </button>
        </div>
      )}

      {/* Main: Calendar + Right Sidebar */}
      <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">

        {/* Calendar Grid */}
        <div className="flex-1 min-w-0 bg-card rounded-lg border border-border shadow-sm dark:shadow-none flex flex-col">

          {/* Period Nav */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={goPrev}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-card text-fg-secondary hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Periode sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              <h2 className="text-sm sm:text-base font-semibold text-foreground text-center">
                {periodLabel}
              </h2>
              <button
                onClick={goNext}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-card text-fg-secondary hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Periode berikutnya"
              >
                <ChevronRight size={14} />
              </button>
              {!isAtToday && (
                <button
                  onClick={goToday}
                  className="rounded-md border border-input bg-card px-2 py-1 text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Hari Ini
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap font-mono tabular-nums">
              <span className="flex items-center gap-1.5 text-fg-secondary">
                <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                {totalPlans} Total Plans
              </span>
              {overduePlans > 0 && (
                <span className="flex items-center gap-1.5 text-destructive-text font-medium">
                  <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                  {overduePlans} Overdue
                </span>
              )}
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                {donePlans} Selesai
              </span>
            </div>
          </div>

          {/* View Container: loading -> error -> empty -> content */}
          {loading && !events ? (
            <div className="p-4 space-y-3" aria-busy="true">
              <div className="grid grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-6 bg-muted rounded animate-pulse" />
                ))}
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div role="alert" className="m-5 rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-destructive-text">{error}</p>
              <button
                type="button"
                onClick={fetchEvents}
                className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Coba lagi
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-auto">
              {viewMode === 'week' ? (
                <CalendarWeekView
                  baseDate={anchorDate}
                  events={events ?? []}
                  onSelectEvent={(ev) => setSelected(ev)}
                />
              ) : viewMode === 'day' ? (
                <CalendarAgendaView
                  selectedDate={anchorDate}
                  events={events ?? []}
                  onSelectEvent={(ev) => setSelected(ev)}
                />
              ) : (
                /* Month Grid (Default) */
                <div className="flex-1 overflow-auto">
                  {events && events.length === 0 && !loading && (
                    <div className="mx-4 my-3 p-4 rounded-lg bg-muted border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground shrink-0">
                          <CalendarDays size={18} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Belum ada Action Plan di periode {periodLabel}.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mulai jadwalkan rencana kerja atau ubah navigasi bulan untuk melihat periode lain.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus size={13} aria-hidden="true" />
                        Tambah Action Plan
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-7 border-b border-border">
                    {WEEKDAY_LABELS.map((label) => (
                      <div
                        key={label}
                        className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center"
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  {weeks.map((week, wi) => {
                    const MAX_VISIBLE_LANES = 3
                    const segments = computeWeekSegments(week, events ?? [])
                    const visibleSegments = segments.filter((s) => s.lane < MAX_VISIBLE_LANES)

                    // Hitung overflow per hari
                    const dayOverflows = week.map((date) => {
                      const dStr = fmtISO(date)
                      const dayEvents = (events ?? []).filter((e) => {
                        const sStr = e.startDate.slice(0, 10)
                        const eStr = e.endDate.slice(0, 10)
                        return dStr >= sStr && dStr <= eStr
                      })
                      return {
                        date,
                        count: dayEvents.length,
                        overflow: Math.max(0, dayEvents.length - MAX_VISIBLE_LANES),
                      }
                    })

                    const hasAnyOverflow = dayOverflows.some((d) => d.overflow > 0)
                    const effectiveLaneCount = visibleSegments.reduce((max, s) => Math.max(max, s.lane + 1), 0)

                    return (
                      <div
                        key={wi}
                        className="grid grid-cols-7 border-b border-border last:border-b-0"
                        style={{ gridAutoRows: 'auto' }}
                      >
                        {week.map((date, di) => {
                          const inMonth = date.getMonth() === anchorDate.getMonth()
                          const isToday = fmtISO(date) === fmtISO(today)
                          const isHoliday = date.getMonth() === 7 && date.getDate() === 17
                          return (
                            <div
                              key={di}
                              style={{ gridColumn: di + 1, gridRow: 1 }}
                              className={`border-r border-border last:border-r-0 px-2 py-2 min-h-[64px] ${
                                isToday
                                  ? 'bg-accent'
                                  : !inMonth
                                  ? 'bg-muted/50'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <span
                                  className={`text-xs font-medium font-mono tabular-nums leading-none ${
                                    isToday
                                      ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground font-semibold'
                                      : inMonth
                                      ? 'text-foreground'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {date.getDate()}
                                </span>
                                {isToday && (
                                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                                    HARI INI
                                  </span>
                                )}
                                {isHoliday && inMonth && (
                                  <span className="text-xs font-bold text-destructive-text uppercase tracking-wide">
                                    HUT RI
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {visibleSegments.map((seg) => {
                          const color = AP_STATUS_BAR_COLOR[seg.event.status] ?? AP_STATUS_BAR_COLOR.NOT_STARTED
                          const dot = AP_STATUS_DOT[seg.event.status] ?? AP_STATUS_DOT.NOT_STARTED
                          const isOverdue = seg.event.status === 'OVERDUE'
                          const displayCode = seg.event.code ?? seg.event.id.slice(0, 6).toUpperCase()

                          return (
                            <div
                              key={`${seg.event.id}-${seg.colStart}`}
                              style={{ gridColumn: `${seg.colStart} / span ${seg.colSpan}`, gridRow: 2 + seg.lane }}
                              className="px-1 pb-1"
                            >
                              <button
                                type="button"
                                onClick={() => setSelected(seg.event)}
                                title={`${displayCode}: ${seg.event.title} — PIC: ${seg.event.picName}`}
                                className="w-full flex items-center gap-1 px-2 py-0.5 rounded-sm bg-card text-left hover:brightness-95 dark:hover:brightness-110 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                style={{
                                  backgroundColor: color + '18',
                                  border: `1px solid ${color}40`,
                                  borderLeftWidth: 3,
                                  borderLeftColor: color,
                                }}
                              >
                                {isOverdue && <AlertTriangle size={10} className="shrink-0 text-destructive-text" aria-hidden="true" />}
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                                <span className="truncate text-xs font-medium leading-tight text-foreground">
                                  {seg.event.title}
                                </span>
                              </button>
                            </div>
                          )
                        })}

                        {/* Tombol progressive disclosure +X lainnya */}
                        {hasAnyOverflow &&
                          dayOverflows.map((d, di) => {
                            if (d.overflow <= 0) return null
                            return (
                              <div
                                key={`overflow-${di}`}
                                style={{ gridColumn: di + 1, gridRow: 2 + MAX_VISIBLE_LANES }}
                                className="px-1 pb-1"
                              >
                                <button
                                  type="button"
                                  onClick={() => setOverflowDate(d.date)}
                                  className="w-full text-center py-0.5 rounded-sm text-xs font-semibold text-fg-secondary hover:bg-accent border border-dashed border-border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  +{d.overflow} lainnya
                                </button>
                              </div>
                            )
                          })}

                        {effectiveLaneCount === 0 && !hasAnyOverflow && (
                          <div style={{ gridColumn: '1 / span 7', gridRow: 2 }} className="h-2" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Sidebar */}
        {showSidebar && (
          <div className="w-full xl:w-72 shrink-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">

            {/* Upcoming Deadlines */}
            <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlarmClock size={14} className="text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Upcoming Deadlines
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">7 Hari ke Depan</span>
              </div>
              <div className="space-y-3">
                {upcomingDeadlines.length === 0 && !loading && (
                  <p className="text-xs text-muted-foreground text-center py-2">Belum ada deadline dalam 7 hari ke depan.</p>
                )}
                {upcomingDeadlines.map((ev) => {
                  const daysLeft = diffDays(today, new Date(ev.endDate))
                  const dl = deadlineLabel(daysLeft)
                  const initials = ev.picName.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')
                  return (
                    <button key={ev.id} type="button" onClick={() => setSelected(ev)} className="w-full text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="flex items-start gap-2 group">
                        <div className="h-7 w-7 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold text-fg-secondary mt-0.5">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:underline underline-offset-2">
                            {ev.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">PIC: {ev.picName}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${AP_STATUS_DOT[ev.status] ?? AP_STATUS_DOT.NOT_STARTED}`} />
                            <span className="text-xs text-muted-foreground">{AP_STATUS_LABEL[ev.status] ?? ev.status}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-xs font-mono tabular-nums ${dl.className}`}>{dl.text}</span>
                          <p className="text-xs font-mono tabular-nums text-muted-foreground mt-0.5">
                            {new Date(ev.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
                {loading && !events && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Milestone Progress */}
            <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flag size={14} className="text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Progres Periode
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {periodLabel}
                </span>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Selesai</span>
                  <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                    {milestonePct}%{' '}
                    <span className="font-normal text-muted-foreground">
                      ({milestoneDone}/{milestoneTotal} plan)
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${milestonePct}%` }}
                  />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Warna Status</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {Object.entries(AP_STATUS_DOT).map(([key, color]) => (
                    <div key={key} className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
                      <span className="text-xs text-muted-foreground truncate">{AP_STATUS_LABEL[key] ?? key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Pembaruan Data */}
            <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Pembaruan Jadwal
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Terhubung</span>
                </span>
              </div>

              {/* Status Ringkas */}
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Update Terakhir</span>
                  <span className="font-semibold font-mono tabular-nums text-foreground">
                    {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Jadwal Ditampilkan</span>
                  <span className="font-semibold font-mono tabular-nums text-foreground">
                    {events?.length ?? 0} Action Plan
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={fetchEvents}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full rounded-md border border-input bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RefreshCw size={12} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
                  <span>{loading ? 'Memperbarui...' : 'Perbarui Jadwal'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CalendarEventModal event={selected} onClose={() => setSelected(null)} />

      {/* Progressive Disclosure Modal untuk Agenda Hari Meluap */}
      <CalendarDayEventsModal
        open={!!overflowDate}
        onClose={() => setOverflowDate(null)}
        date={overflowDate}
        events={overflowEvents}
        onSelectEvent={(ev) => setSelected(ev)}
      />

      {/* Action Plan Form Modal (PRD §B8, §C1 #7) */}
      <ActionPlanFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        actionPlan={null}
        onSuccess={() => {
          fetchEvents()
        }}
      />
    </div>
  )
}
