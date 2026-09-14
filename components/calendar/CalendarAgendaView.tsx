'use client'

import { useState, useMemo } from 'react'
import type { CalendarEvent } from '@/lib/calendar-grid'
import { fmtISO } from '@/lib/calendar-grid'
import { AlertTriangle, User, Calendar as CalendarIcon, Briefcase, Clock, CalendarCheck2, PlayCircle } from 'lucide-react'

interface CalendarAgendaViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}

type AgendaFilterMode = 'relevant' | 'deadline_only' | 'start_only' | 'ongoing'

const STATUS_BADGE: Record<string, { label: string; style: string }> = {
  NOT_STARTED: { label: 'Not Started', style: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  IN_PROGRESS: { label: 'In Progress', style: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  PENDING_APPROVAL: { label: 'Review', style: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' },
  EVIDENCE_REQUIRED: { label: 'Evidence Needed', style: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  APPROVED: { label: 'Approved', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  REJECTED: { label: 'Revision', style: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  OVERDUE: { label: 'Overdue', style: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 font-bold' },
  COMPLETE: { label: 'Complete', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
}

export function CalendarAgendaView({ selectedDate, events, onSelectEvent }: CalendarAgendaViewProps) {
  const [filterMode, setFilterMode] = useState<AgendaFilterMode>('relevant')
  const targetDateStr = fmtISO(selectedDate)

  // Klasifikasikan event berdasarkan relevansinya dengan hari ini
  const categorizedEvents = useMemo(() => {
    return events.map((e) => {
      const s = e.startDate.slice(0, 10)
      const end = e.endDate.slice(0, 10)
      const isStartToday = s === targetDateStr
      const isDeadlineToday = end === targetDateStr
      const isOngoing = targetDateStr > s && targetDateStr < end
      const isActiveSpan = targetDateStr >= s && targetDateStr <= end

      return {
        event: e,
        isStartToday,
        isDeadlineToday,
        isOngoing,
        isActiveSpan,
        // Relevansi utama: Mulai hari ini ATAU Deadline hari ini
        isKeyMilestoneToday: isStartToday || isDeadlineToday,
      }
    })
  }, [events, targetDateStr])

  // Filter event sesuai mode tab pilihan pengguna
  const displayedItems = useMemo(() => {
    if (filterMode === 'deadline_only') {
      return categorizedEvents.filter((item) => item.isDeadlineToday)
    }
    if (filterMode === 'start_only') {
      return categorizedEvents.filter((item) => item.isStartToday)
    }
    if (filterMode === 'ongoing') {
      return categorizedEvents.filter((item) => item.isActiveSpan)
    }
    // Default 'relevant': Mulai hari ini ATAU Deadline hari ini (jika tidak ada, fallback ke rentang aktif)
    const keyItems = categorizedEvents.filter((item) => item.isKeyMilestoneToday)
    if (keyItems.length > 0) return keyItems
    return categorizedEvents.filter((item) => item.isActiveSpan)
  }, [categorizedEvents, filterMode])

  // Hitung summary metrik harian
  const metrics = useMemo(() => {
    const deadlineTodayCount = categorizedEvents.filter((i) => i.isDeadlineToday).length
    const startTodayCount = categorizedEvents.filter((i) => i.isStartToday).length
    const totalActive = categorizedEvents.filter((i) => i.isActiveSpan).length
    const overdueCount = categorizedEvents.filter((i) => i.isActiveSpan && i.event.status === 'OVERDUE').length
    return { deadlineTodayCount, startTodayCount, totalActive, overdueCount }
  }, [categorizedEvents])

  const dateLabel = selectedDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex-1 p-5 space-y-5">
      {/* Header Agenda & Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Agenda Harian
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {dateLabel}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fokus pada Action Plan yang <strong className="text-slate-800 dark:text-slate-200 font-semibold">jatuh tempo</strong> atau <strong className="text-slate-800 dark:text-slate-200 font-semibold">dimulai</strong> pada tanggal ini.
          </p>
        </div>

        {/* Metrik cards */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center min-w-[70px]">
            <span className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold block">Deadline Hari Ini</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{metrics.deadlineTodayCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center min-w-[70px]">
            <span className="text-[10px] text-blue-500 font-semibold block">Mulai Hari Ini</span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{metrics.startTodayCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center min-w-[70px]">
            <span className="text-[10px] text-slate-400 font-medium block">Total Aktif</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{metrics.totalActive}</span>
          </div>
          {metrics.overdueCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-center min-w-[70px]">
              <span className="text-[10px] text-red-500 font-semibold block">Overdue</span>
              <span className="text-xs font-bold text-red-600 dark:text-red-400">{metrics.overdueCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Mode Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-200/70 dark:border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setFilterMode('relevant')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
            filterMode === 'relevant'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Mulai / Deadline Hari Ini
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('deadline_only')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
            filterMode === 'deadline_only'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Deadline Saja ({metrics.deadlineTodayCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('start_only')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
            filterMode === 'start_only'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Mulai Saja ({metrics.startTodayCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('ongoing')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
            filterMode === 'ongoing'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Semua Berjalan ({metrics.totalActive})
        </button>
      </div>

      {/* List Action Plan Kronologis */}
      <div className="space-y-3">
        {displayedItems.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200/80 dark:border-slate-800 rounded-xl">
            <Clock className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Tidak ada Action Plan pada filter ini
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih tab "Semua Berjalan" atau navigasikan tanggal untuk melihat jadwal lainnya.
            </p>
          </div>
        ) : (
          displayedItems.map(({ event: ev, isStartToday, isDeadlineToday }) => {
            const badge = STATUS_BADGE[ev.status] ?? STATUS_BADGE.NOT_STARTED
            const isOverdue = ev.status === 'OVERDUE'
            const displayCode = ev.code ?? ev.id.slice(0, 6).toUpperCase()

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                      {displayCode}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.style}`}>
                      {badge.label}
                    </span>
                    {isDeadlineToday && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        <CalendarCheck2 size={11} />
                        Deadline Hari Ini
                      </span>
                    )}
                    {isStartToday && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        <PlayCircle size={11} />
                        Mulai Hari Ini
                      </span>
                    )}
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                        <AlertTriangle size={11} />
                        Overdue
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {ev.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      <span>{ev.picName}</span>
                      {ev.labelName && ev.labelName !== '-' && (
                        <span className="text-[10px] text-slate-400">({ev.labelName})</span>
                      )}
                    </div>
                    {ev.projectName && (
                      <div className="flex items-center gap-1.5">
                        <Briefcase size={13} className="text-slate-400" />
                        <span>{ev.projectName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={13} className="text-slate-400" />
                      <span>
                        {new Date(ev.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s/d{' '}
                        {new Date(ev.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    Lihat Detail →
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
