'use client'

import { useMemo, useState } from 'react'
import type { CalendarEvent } from '@/lib/calendar-grid'
import { fmtISO, getWeekDays, computeWeekSegments } from '@/lib/calendar-grid'
import { Calendar as CalendarIcon, Flag } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL, AP_STATUS_BAR_COLOR } from '@/lib/status-labels'

interface CalendarWeekViewProps {
  baseDate: Date
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}

const WEEKDAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

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
      <div className="px-4 py-2 bg-muted border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarIcon size={13} aria-hidden="true" />
          <span className="font-medium">Jadwal Mingguan Terstruktur</span>
          <span className="text-xs font-mono tabular-nums">({multiDaySegments.length} Rentang Multi-Hari)</span>
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2 py-0.5 rounded-sm text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              filterMode === 'all'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semua Komitmen
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('milestones')}
            className={`px-2 py-0.5 rounded-sm text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              filterMode === 'milestones'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Hanya Deadline & Target
          </button>
        </div>
      </div>

      <div className="min-w-0 md:min-w-[720px] xl:min-w-0 flex-1 flex flex-col">
        {/* Kolom Header Tanggal */}
        <div className="grid grid-cols-7 border-b border-border divide-x divide-border">
          {days.map((day, idx) => {
            const dayStr = fmtISO(day)
            const isToday = dayStr === todayStr
            return (
              <div
                key={dayStr}
                className={`px-2.5 py-2.5 text-center ${
                  isToday ? 'bg-accent' : 'bg-muted'
                }`}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {WEEKDAY_NAMES[idx]}
                </p>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 text-xs font-bold font-mono tabular-nums rounded-full ${
                      isToday ? 'bg-primary text-primary-foreground shadow-xs' : 'text-foreground'
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
          <div className="border-b border-border bg-muted p-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
              Komitmen Berjalan (Multi-Hari)
            </p>
            <div
              className="grid grid-cols-7 gap-y-1.5 gap-x-1 relative"
              style={{
                gridTemplateRows: `repeat(${maxLane}, minmax(28px, auto))`,
              }}
            >
              {multiDaySegments.map((seg) => {
                const color = AP_STATUS_BAR_COLOR[seg.event.status] ?? AP_STATUS_BAR_COLOR.NOT_STARTED
                const displayCode = seg.event.code ?? seg.event.id.slice(0, 6).toUpperCase()

                return (
                  <button
                    key={`${seg.event.id}-${seg.colStart}`}
                    type="button"
                    onClick={() => onSelectEvent(seg.event)}
                    style={{
                      gridColumn: `${seg.colStart} / span ${seg.colSpan}`,
                      gridRow: seg.lane + 1,
                      backgroundColor: color + '15',
                      borderColor: color + '40',
                      borderLeftColor: color,
                    }}
                    className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-md border border-l-4 bg-card text-left hover:brightness-95 dark:hover:brightness-110 transition-all cursor-pointer shadow-2xs dark:shadow-none group min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono tabular-nums text-xs font-semibold text-fg-secondary bg-card px-1.5 py-0.5 rounded-sm border border-border shrink-0">
                        {displayCode}
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate leading-tight">
                        {seg.event.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      <span className="hidden sm:inline font-medium">{seg.event.picName}</span>
                      <StatusBadge
                        status={seg.event.status}
                        styleMap={AP_STATUS_STYLE}
                        labelMap={AP_STATUS_LABEL}
                        className="px-1.5 py-0"
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: Daily Milestone & Deadline Column Stack */}
        <div className="grid grid-cols-7 flex-1 divide-x divide-border">
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
                  isToday ? 'bg-accent/40' : 'bg-card'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border">
                  <span>Target Hari Ini</span>
                  <span className="font-mono tabular-nums">{dayEvents.length}</span>
                </div>

                {dayEvents.length === 0 ? (
                  <div className="h-20 flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-2 text-center text-muted-foreground text-xs">
                    Belum ada deadline
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
                        className="w-full text-left p-2 rounded-lg border border-border bg-card hover:border-input hover:shadow-xs transition-all cursor-pointer flex flex-col gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono tabular-nums text-xs font-semibold text-fg-secondary bg-muted px-1 py-0.5 rounded-sm">
                            {displayCode}
                          </span>
                          {isDeadline && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1 rounded border border-amber-200/60 dark:border-amber-900/50">
                              <Flag size={10} aria-hidden="true" />
                              Deadline
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                          {ev.title}
                        </p>

                        <div className="pt-1.5 border-t border-border flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                          <span className="truncate max-w-[90px]">{ev.picName}</span>
                          <StatusBadge
                            status={ev.status}
                            styleMap={AP_STATUS_STYLE}
                            labelMap={AP_STATUS_LABEL}
                            className="px-1 py-0"
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
