'use client'

import { useMemo, useState } from 'react'
import type { CalendarEvent } from '@/lib/calendar-grid'
import { fmtISO, getWeekDays, computeWeekSegments } from '@/lib/calendar-grid'
import { Calendar as CalendarIcon, Flag } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL } from '@/lib/status-labels'

interface CalendarWeekViewProps {
  baseDate: Date
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}

const WEEKDAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

const STATUS_BAR_COLOR: Record<string, string> = {
  NOT_STARTED: '#94a3b8',
  IN_PROGRESS: '#0EA5E9',
  PENDING_APPROVAL: '#8b5cf6',
  EVIDENCE_REQUIRED: '#06b6d4',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  OVERDUE: '#ef4444',
  COMPLETE: '#10b981',
}

export function CalendarWeekView({ baseDate, events, onSelectEvent }: CalendarWeekViewProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'milestones'>('all')
  const days = useMemo(() => getWeekDays(baseDate), [baseDate])
  const todayStr = fmtISO(new Date())

  // Pisahkan multi-day events (span bar) vs single-day milestones
  const weekSegments = useMemo(() => {
    return computeWeekSegments(days, events)
  }, [days, events])

  const multiDaySegments = useMemo(() => {
    return weekSegments.filter((seg) => seg.colSpan > 1)
  }, [weekSegments])

  const maxLane = useMemo(() => {
    if (multiDaySegments.length === 0) return 0
    return Math.max(...multiDaySegments.map((s) => s.lane)) + 1
  }, [multiDaySegments])

  return (
    <div className="flex-1 w-full overflow-x-auto flex flex-col">
      {/* Sub-toolbar mode tampilan mingguan */}
      <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <CalendarIcon size={13} className="text-blue-500 dark:text-blue-300" />
          <span className="font-medium">Jadwal Mingguan Terstruktur</span>
          <span className="text-[11px] text-slate-400">({multiDaySegments.length} Rentang Multi-Hari)</span>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Semua Komitmen
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('milestones')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterMode === 'milestones'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Hanya Deadline & Target
          </button>
        </div>
      </div>

      <div className="min-w-0 md:min-w-[720px] xl:min-w-0 flex-1 flex flex-col">
        {/* Kolom Header Tanggal */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800">
          {days.map((day, idx) => {
            const dayStr = fmtISO(day)
            const isToday = dayStr === todayStr
            return (
              <div
                key={dayStr}
                className={`px-2.5 py-2.5 text-center ${
                  isToday ? 'bg-blue-50/80 dark:bg-blue-950/40' : 'bg-slate-50/70 dark:bg-slate-800/40'
                }`}
              >
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {WEEKDAY_NAMES[idx]}
                </p>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 text-xs font-bold rounded-full ${
                      isToday ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* SECTION 1: Multi-Day Continuous Span Bars (Asana / Google Calendar Pattern) */}
        {multiDaySegments.length > 0 && (
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 p-2">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-1">
              Komitmen Berjalan (Multi-Hari)
            </p>
            <div
              className="grid grid-cols-7 gap-y-1.5 gap-x-1 relative"
              style={{
                gridTemplateRows: `repeat(${maxLane}, minmax(28px, auto))`,
              }}
            >
              {multiDaySegments.map((seg) => {
                const color = STATUS_BAR_COLOR[seg.event.status] ?? '#94a3b8'
                const isOverdue = seg.event.status === 'OVERDUE'
                const displayCode = seg.event.code ?? seg.event.id.slice(0, 6).toUpperCase()

                return (
                  <button
                    key={`${seg.event.id}-${seg.colStart}`}
                    type="button"
                    onClick={() => onSelectEvent(seg.event)}
                    style={{
                      gridColumn: `${seg.colStart} / span ${seg.colSpan}`,
                      gridRow: seg.lane + 1,
                      backgroundColor: isOverdue ? '#fef2f2' : color + '15',
                      borderColor: isOverdue ? '#fecaca' : color + '40',
                      borderLeftColor: color,
                    }}
                    className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-md border border-l-4 text-left hover:brightness-95 dark:hover:brightness-110 transition-all cursor-pointer shadow-2xs group min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700 shrink-0">
                        {displayCode}
                      </span>
                      <span
                        className="text-xs font-semibold truncate leading-tight"
                        style={{ color: isOverdue ? '#ef4444' : color }}
                      >
                        {seg.event.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                      <span className="hidden sm:inline font-medium">{seg.event.picName}</span>
                      <StatusBadge
                        status={seg.event.status}
                        styleMap={AP_STATUS_STYLE}
                        labelMap={AP_STATUS_LABEL}
                        className="text-[9px] px-1.5 py-0"
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: Daily Milestone & Deadline Column Stack */}
        <div className="grid grid-cols-7 flex-1 divide-x divide-slate-100 dark:divide-slate-800">
          {days.map((day) => {
            const dayStr = fmtISO(day)
            const isToday = dayStr === todayStr

            // Event yang berakhir hari ini (Deadline), atau mulai hari ini (Kickoff), atau single-day event
            const dayEvents = events.filter((e) => {
              const s = e.startDate.slice(0, 10)
              const end = e.endDate.slice(0, 10)
              if (filterMode === 'milestones') {
                return end === dayStr || s === dayStr
              }
              // Jika filter 'all', tampilkan event 1-hari ATAU event yang jatuh tempo hari ini agar tidak duplikat
              return end === dayStr || (s === dayStr && end === dayStr)
            })

            return (
              <div
                key={dayStr}
                className={`p-2 space-y-2 flex flex-col min-h-[380px] ${
                  isToday ? 'bg-blue-50/10 dark:bg-blue-950/10' : 'bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Target Hari Ini</span>
                  <span>{dayEvents.length}</span>
                </div>

                {dayEvents.length === 0 ? (
                  <div className="h-20 flex flex-col items-center justify-center border border-dashed border-slate-200/70 dark:border-slate-800/70 rounded-lg p-2 text-center text-slate-300 dark:text-slate-600 text-[10px]">
                    Tidak ada deadline
                  </div>
                ) : (
                  dayEvents.map((ev) => {
                    const isDeadline = ev.endDate.slice(0, 10) === dayStr
                    const displayCode = ev.code ?? ev.id.slice(0, 6).toUpperCase()

                    return (
                      <button
                        key={`${ev.id}-${dayStr}`}
                        type="button"
                        onClick={() => onSelectEvent(ev)}
                        className="w-full text-left p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/90 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1 py-0.5 rounded">
                            {displayCode}
                          </span>
                          {isDeadline && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1 rounded border border-amber-200/60 dark:border-amber-900/50">
                              <Flag size={9} />
                              Deadline
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                          {ev.title}
                        </p>

                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="truncate max-w-[90px]">{ev.picName}</span>
                          <StatusBadge
                            status={ev.status}
                            styleMap={AP_STATUS_STYLE}
                            labelMap={AP_STATUS_LABEL}
                            className="text-[9px] px-1 py-0"
                          />
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
