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
} from 'lucide-react'
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal'
import { ActionPlanFormModal } from '@/components/action-plans/ActionPlanFormModal'
import {
  getMonthGrid,
  computeWeekSegments,
  fmtISO,
  type CalendarEvent,
} from '@/lib/calendar-grid'
import { AP_STATUS_LABEL } from '@/lib/status-labels'

/* ─── constants ─────────────────────────────────────────────── */
const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const STATUS_DOT_COLOR: Record<string, string> = {
  NOT_STARTED: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  PENDING_APPROVAL: 'bg-violet-500',
  EVIDENCE_REQUIRED: 'bg-cyan-500',
  APPROVED: 'bg-emerald-500',
  REJECTED: 'bg-red-500',
  OVERDUE: 'bg-red-500',
  COMPLETE: 'bg-emerald-500',
}

const STATUS_BAR_COLOR: Record<string, string> = {
  NOT_STARTED: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  PENDING_APPROVAL: '#8b5cf6',
  EVIDENCE_REQUIRED: '#06b6d4',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  OVERDUE: '#ef4444',
  COMPLETE: '#10b981',
}

type ViewTab = 'table' | 'board' | 'calendar'
type QuarterTab = 'today' | 'week' | 'month' | 'quarter'

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

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [activeView, setActiveView] = useState<ViewTab>('calendar')
  const [quarterTab, setQuarterTab] = useState<QuarterTab>('month')

  // Dynamic filter state
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPic, setSelectedPic] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')

  // Create Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Load dynamic filter options from API
  useEffect(() => {
    fetch('/api/calendar/filters')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setFilterOptions(data)
      })
      .catch((err) => console.error('Gagal memuat opsi filter kalender:', err))
  }, [])

  const weeks = useMemo(() => getMonthGrid(currentMonth), [currentMonth])
  const gridFrom = weeks[0][0]
  const gridTo = weeks[weeks.length - 1][6]

  // Hitung rentang query berdasarkan tab waktu cepat
  const queryRange = useMemo(() => {
    const now = new Date()
    if (quarterTab === 'today') {
      const d = fmtISO(now)
      return { from: d, to: d }
    }
    if (quarterTab === 'week') {
      const day = now.getDay()
      const diffToMon = (day + 6) % 7
      const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon)
      const sun = new Date(mon.getTime() + 6 * 86_400_000)
      return { from: fmtISO(mon), to: fmtISO(sun) }
    }
    if (quarterTab === 'quarter') {
      const q = Math.floor(now.getMonth() / 3) + 1
      const startMonth = (q - 1) * 3
      const qStart = new Date(now.getFullYear(), startMonth, 1)
      const qEnd = new Date(now.getFullYear(), startMonth + 3, 0)
      return { from: fmtISO(qStart), to: fmtISO(qEnd) }
    }
    return { from: fmtISO(gridFrom), to: fmtISO(gridTo) }
  }, [quarterTab, gridFrom, gridTo])

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
        if (!r.ok) throw new Error('Gagal memuat data kalender')
        return r.json()
      })
      .then((data) => setEvents(data))
      .catch(() => setError('Terjadi kesalahan. Coba lagi.'))
      .finally(() => setLoading(false))
  }, [queryRange, selectedStatus, selectedPic, selectedProject, selectedPriority])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  function goMonth(offset: number) {
    setQuarterTab('month')
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + offset)
      return d
    })
  }

  function goToday() {
    const d = new Date()
    d.setDate(1)
    setCurrentMonth(d)
  }

  const today = new Date()
  const monthLabel = currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const currentQuarterNum = Math.floor(today.getMonth() / 3) + 1
  const currentQuarterLabel = `Q${currentQuarterNum} ${today.getFullYear()}`

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

  const isCurrentMonth =
    currentMonth.getMonth() === today.getMonth() &&
    currentMonth.getFullYear() === today.getFullYear()

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/30 px-3 py-1.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
              PRD §B8 &amp; §C1 #13 COMPLIANT • LIVE DATES &amp; MILESTONES
            </span>
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
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
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

        {/* Quick Range Chips */}
        {(
          [
            { key: 'today', label: 'Hari Ini' },
            { key: 'week', label: 'Minggu Ini' },
            { key: 'month', label: 'Bulan Ini' },
            { key: 'quarter', label: currentQuarterLabel },
          ] as { key: QuarterTab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setQuarterTab(key)
              if (key === 'today' || key === 'month') {
                goToday()
              }
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              quarterTab === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

        <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <LayoutGrid size={13} />
          Monthly Grid
        </span>
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
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Calendar Grid */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">

          {/* Month Nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => goMonth(-1)}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 min-w-[150px] text-center">
                {monthLabel}
              </h2>
              <button
                onClick={() => goMonth(1)}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight size={14} />
              </button>
              {!isCurrentMonth && (
                <button
                  onClick={goToday}
                  className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Hari Ini
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
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

          {/* Grid */}
          {(!loading || events) && (
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
                const segments = computeWeekSegments(week, events ?? [])
                const laneCount = segments.reduce((max, s) => Math.max(max, s.lane + 1), 0)
                return (
                  <div
                    key={wi}
                    className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                    style={{ gridAutoRows: 'auto' }}
                  >
                    {week.map((date, di) => {
                      const inMonth = date.getMonth() === currentMonth.getMonth()
                      const isToday = fmtISO(date) === fmtISO(today)
                      const isHoliday = date.getMonth() === 7 && date.getDate() === 17
                      return (
                        <div
                          key={di}
                          style={{ gridColumn: di + 1, gridRow: 1 }}
                          className={`border-r border-slate-100 dark:border-slate-800 last:border-r-0 px-2 py-2 min-h-[72px] ${
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

                    {segments.map((seg) => {
                      const color = STATUS_BAR_COLOR[seg.event.status] ?? '#94a3b8'
                      const dot = STATUS_DOT_COLOR[seg.event.status] ?? 'bg-slate-400'
                      const isOverdue = seg.event.status === 'OVERDUE'
                      return (
                        <div
                          key={`${seg.event.id}-${seg.colStart}`}
                          style={{ gridColumn: `${seg.colStart} / span ${seg.colSpan}`, gridRow: 2 + seg.lane }}
                          className="px-1 pb-1"
                        >
                          <button
                            type="button"
                            onClick={() => setSelected(seg.event)}
                            title={`${seg.event.title} — ${seg.event.picName}`}
                            className="w-full flex items-center gap-1 px-2 py-0.5 rounded text-left hover:brightness-105 transition-all"
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
                              [{seg.event.id.slice(0, 6).toUpperCase()}] {seg.event.title}
                            </span>
                          </button>
                        </div>
                      )
                    })}
                    {laneCount === 0 && (
                      <div style={{ gridColumn: '1 / span 7', gridRow: 2 }} className="h-2" />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {loading && !events && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-xs text-slate-400">Memuat kalender...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-4">

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
                      <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white mt-0.5">
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

          {/* Milestone Progress (PRD §B8, §B10 Compliant: Active Period target, no fake sprint) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Milestone Progress
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {quarterTab === 'quarter'
                  ? `Kuartal ${currentQuarterNum} ${today.getFullYear()}`
                  : quarterTab === 'today'
                  ? 'Hari Ini'
                  : quarterTab === 'week'
                  ? 'Minggu Ini'
                  : monthLabel}
              </span>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Completion</span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  {milestonePct}%{' '}
                  <span className="font-normal text-slate-400">
                    ({milestoneDone}/{milestoneTotal} plans)
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
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">STATUS COLOR LEGEND (§D2)</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {[
                  { color: 'bg-blue-500', label: 'In Progress' },
                  { color: 'bg-violet-500', label: 'Pending Approval' },
                  { color: 'bg-cyan-500', label: 'Evidence Required' },
                  { color: 'bg-red-500', label: 'Needs Revision' },
                  { color: 'bg-emerald-500', label: 'Complete/Approved' },
                  { color: 'bg-orange-300', label: 'Overdue' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Export & Sync */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw size={14} className="text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                Quick Export &amp; Sync
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
              Unduh laporan visual status eksekutif bulanan atau pantau sinkronisasi database berkala.
            </p>
            <div className="space-y-2">
              <a
                href={exportHref}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
              >
                <Download size={12} className="text-blue-500 group-hover:text-blue-600 transition-colors shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-700 dark:text-slate-200">Download Executive PDF</p>
                  <p className="text-[9px] text-slate-400">(/api/calendar/export)</p>
                </div>
              </a>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
                <Clock size={12} />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Terakhir disinkronkan otomatis via{' '}
                  <strong className="text-slate-700 dark:text-slate-300">Cron 00:01 WIB</strong>{' '}
                  <span className="text-slate-400">(§A4, §C1 #15)</span>
                </p>
              </div>
              <button
                onClick={fetchEvents}
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <RefreshCw size={12} />
                Refresh Data Sekarang
              </button>
            </div>
          </div>
        </div>
      </div>

      <CalendarEventModal event={selected} onClose={() => setSelected(null)} />

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
