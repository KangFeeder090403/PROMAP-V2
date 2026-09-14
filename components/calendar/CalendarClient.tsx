'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  AlarmClock,
  Flag,
  RefreshCw,
  LayoutGrid,
  LayoutList,
  CalendarDays,
  AlertTriangle,
  Clock,
  X,
  Plus,
  PanelRight,
} from 'lucide-react'
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal'
import { CalendarDayEventsModal } from '@/components/calendar/CalendarDayEventsModal'
import { CalendarWeekView } from '@/components/calendar/CalendarWeekView'
import { CalendarAgendaView } from '@/components/calendar/CalendarAgendaView'
import { ActionPlanFormModal } from '@/components/action-plans/ActionPlanFormModal'
import {
  getMonthGrid,
  computeWeekSegments,
  fmtISO,
  resolveCalendarRange,
  type CalendarEvent,
  type CalendarViewMode,
} from '@/lib/calendar-grid'
import { AP_STATUS_LABEL } from '@/lib/status-labels'

/* ─── constants ─────────────────────────────────────────────── */
const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const STATUS_DOT_COLOR: Record<string, string> = {
  NOT_STARTED: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  PENDING_APPROVAL: 'bg-indigo-500',
  EVIDENCE_REQUIRED: 'bg-amber-500',
  APPROVED: 'bg-emerald-500',
  REJECTED: 'bg-red-500',
  OVERDUE: 'bg-orange-500',
  COMPLETE: 'bg-emerald-500',
}

const STATUS_BAR_COLOR: Record<string, string> = {
  NOT_STARTED: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  PENDING_APPROVAL: '#6366f1',
  EVIDENCE_REQUIRED: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  OVERDUE: '#f97316',
  COMPLETE: '#10b981',
}

type ViewTab = 'table' | 'board' | 'calendar'

interface FilterOptions {
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
  if (daysLeft < 0) return { text: `${Math.abs(daysLeft)} Hari Lalu`, className: 'text-red-500 font-semibold' }
  if (daysLeft === 0) return { text: 'Besok, 23 Jam', className: 'text-red-500 font-semibold' }
  if (daysLeft <= 3) return { text: `${daysLeft} Hari Lagi`, className: 'text-orange-500 font-semibold' }
  return {
    text: new Date(Date.now() + daysLeft * 86_400_000).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    className: 'text-slate-500',
  }
}

export function CalendarClient() {
  const router = useRouter()

  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [activeView, setActiveView] = useState<ViewTab>('calendar')
  const [showSidebar, setShowSidebar] = useState(true)
  const [overflowDate, setOverflowDate] = useState<Date | null>(null)

  // Dynamic filter state
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPic, setSelectedPic] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')

  // Create Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(() => new Date())

  // Load dynamic filter options from API
  useEffect(() => {
    fetch('/api/calendar/filters')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setFilterOptions(data)
      })
      .catch((err) => console.error('Gagal memuat opsi filter kalender:', err))
  }, [])

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
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-900/50 shadow-sm p-8 text-center max-w-md mx-auto my-12">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Anda tidak punya akses</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Anda tidak memiliki izin untuk melihat kalender jadwal ini.
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

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <nav className="text-xs text-slate-400 flex items-center gap-1.5">
          <span>Workspace</span>
          <span>/</span>
          <span>Execution</span>
          <span>/</span>
          <span className="text-blue-500 font-medium">Calendar &amp; Timeline Schedule</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Execution Calendar &amp; Schedule
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Visualisasi jadwal komitmen kerja, deadline Action Plan, dan jadwal tim lintas divisi
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSidebar((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
              title={showSidebar ? 'Tutup Panel Samping' : 'Buka Panel Samping'}
            >
              <PanelRight size={13} className={showSidebar ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
              <span>{showSidebar ? 'Tutup Panel' : 'Buka Panel'}</span>
            </button>
            <a
              href={exportHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Download size={13} />
              Export PDF Schedule
            </a>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={13} />
              + New Action Plan
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs & Quick Date Range */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
        {/* Switcher View (PRD §B8: Table | Board | Calendar) */}
        <div className="flex items-center gap-1">
          {(
            [
              { key: 'table', icon: LayoutList, label: 'Table' },
              { key: 'board', icon: LayoutGrid, label: 'Board' },
              { key: 'calendar', icon: CalendarDays, label: 'Calendar' },
            ] as { key: ViewTab; icon: React.ElementType; label: string }[]
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'table') router.push('/action-plans')
                else if (key === 'board') router.push('/board')
                else setActiveView('calendar')
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeView === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

        {/* View Mode Switcher (Bulan | Minggu | Hari) */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 p-0.5">
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
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer ${
                viewMode === key
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Filter Toolbar (§B8, §C1 #14) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Status */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filter Status"
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">Semua Status ({filterOptions?.statuses.length ?? 8})</option>
          {filterOptions?.statuses.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Filter PIC */}
        <select
          value={selectedPic}
          onChange={(e) => setSelectedPic(e.target.value)}
          aria-label="Filter PIC"
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">Semua PIC ({filterOptions?.pics.length ?? 0})</option>
          {filterOptions?.pics.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Filter Project */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          aria-label="Filter Project"
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">Semua Project ({filterOptions?.projects.length ?? 0})</option>
          {filterOptions?.projects.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.name}
            </option>
          ))}
        </select>

        {/* Filter Prioritas */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          aria-label="Filter Prioritas"
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">Prioritas: Semua</option>
          {filterOptions?.priorities.map((pr) => (
            <option key={pr.key} value={pr.key}>
              {pr.label}
            </option>
          ))}
        </select>

        {/* Reset Filter Button */}
        {(selectedStatus || selectedPic || selectedProject || selectedPriority) && (
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('')
              setSelectedPic('')
              setSelectedProject('')
              setSelectedPriority('')
            }}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <X size={12} />
            Reset Filter
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
          <Filter size={12} />
          Showing {totalPlans} Active Plans
        </div>
      </div>

      {/* Main: Calendar + Right Sidebar */}
      <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">

        {/* Calendar Grid */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">

          {/* Period Nav */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={goPrev}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Periode sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 text-center">
                {periodLabel}
              </h2>
              <button
                onClick={goNext}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Periode berikutnya"
              >
                <ChevronRight size={14} />
              </button>
              {!isAtToday && (
                <button
                  onClick={goToday}
                  className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
                >
                  Hari Ini
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                {totalPlans} Total Plans
              </span>
              {overduePlans > 0 && (
                <span className="flex items-center gap-1.5 text-red-500 font-medium">
                  <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                  {overduePlans} Overdue
                </span>
              )}
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                {donePlans} Selesai
              </span>
            </div>
          </div>

          {error && <p className="mx-5 mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

          {/* View Container */}
          {(!loading || events) && (
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
                  <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
                    {WEEKDAY_LABELS.map((label) => (
                      <div
                        key={label}
                        className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center"
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
                        className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
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
                              className={`border-r border-slate-100 dark:border-slate-800 last:border-r-0 px-2 py-2 min-h-[64px] ${
                                isToday
                                  ? 'bg-blue-50 dark:bg-blue-950/30'
                                  : !inMonth
                                  ? 'bg-slate-50/50 dark:bg-slate-800/30'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <span
                                  className={`text-xs font-medium leading-none ${
                                    isToday
                                      ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white font-semibold'
                                      : inMonth
                                      ? 'text-slate-700 dark:text-slate-300'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                >
                                  {date.getDate()}
                                </span>
                                {isToday && (
                                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                    HARI INI
                                  </span>
                                )}
                                {isHoliday && inMonth && (
                                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">
                                    HUT RI
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {visibleSegments.map((seg) => {
                          const color = STATUS_BAR_COLOR[seg.event.status] ?? '#94a3b8'
                          const dot = STATUS_DOT_COLOR[seg.event.status] ?? 'bg-slate-400'
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
                                className="w-full flex items-center gap-1 px-2 py-0.5 rounded text-left hover:brightness-105 transition-all cursor-pointer"
                                style={{
                                  backgroundColor: isOverdue ? '#fef2f2' : color + '18',
                                  border: `1px solid ${isOverdue ? '#fecaca' : color + '40'}`,
                                  borderLeftWidth: 3,
                                  borderLeftColor: color,
                                }}
                              >
                                {isOverdue && <AlertTriangle size={9} className="shrink-0 text-red-500" />}
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                                <span
                                  className="truncate text-[10px] font-medium leading-none"
                                  style={{ color: isOverdue ? '#ef4444' : color }}
                                >
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
                                  className="w-full text-center py-0.5 rounded text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-dashed border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
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

          {loading && !events && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-slate-50 dark:bg-slate-800/60 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {showSidebar && (
          <div className="w-full xl:w-72 shrink-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">

            {/* Upcoming Deadlines */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlarmClock size={14} className="text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    Upcoming Deadlines
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">7 Hari ke Depan</span>
              </div>
              <div className="space-y-3">
                {upcomingDeadlines.length === 0 && !loading && (
                  <p className="text-xs text-slate-400 text-center py-2">Tidak ada deadline dalam 7 hari ke depan.</p>
                )}
                {upcomingDeadlines.map((ev) => {
                  const daysLeft = diffDays(today, new Date(ev.endDate))
                  const dl = deadlineLabel(daysLeft)
                  const initials = ev.picName.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')
                  return (
                    <button key={ev.id} onClick={() => setSelected(ev)} className="w-full text-left">
                      <div className="flex items-start gap-2 group">
                        <div className="h-7 w-7 shrink-0 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white mt-0.5">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 transition-colors">
                            {ev.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">PIC: {ev.picName}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT_COLOR[ev.status] ?? 'bg-slate-400'}`} />
                            <span className="text-[9px] text-slate-400">{AP_STATUS_LABEL[ev.status] ?? ev.status}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-[10px] ${dl.className}`}>{dl.text}</span>
                          <p className="text-[9px] text-slate-400 mt-0.5">
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
                      <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Milestone Progress */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flag size={14} className="text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    Progres Periode
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {periodLabel}
                </span>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Selesai</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    {milestonePct}%{' '}
                    <span className="font-normal text-slate-400">
                      ({milestoneDone}/{milestoneTotal} plan)
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${milestonePct}%` }}
                  />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Warna Status</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {[
                    { color: 'bg-blue-500', label: 'In Progress' },
                    { color: 'bg-indigo-500', label: 'Pending Approval' },
                    { color: 'bg-amber-500', label: 'Evidence Required' },
                    { color: 'bg-red-500', label: 'Needs Revision' },
                    { color: 'bg-emerald-500', label: 'Complete/Approved' },
                    { color: 'bg-orange-500', label: 'Overdue' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Pembaruan Data */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Pembaruan Jadwal
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Terhubung
                </span>
              </div>

              {/* Status Ringkas */}
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Update Terakhir</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Jadwal Ditampilkan</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {events?.length ?? 0} Action Plan
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={fetchEvents}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
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
