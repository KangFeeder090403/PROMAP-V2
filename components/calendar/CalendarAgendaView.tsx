'use client'

import { useState, useMemo } from 'react'
import type { CalendarEvent } from '@/lib/calendar-grid'
import { fmtISO } from '@/lib/calendar-grid'
import { AlertTriangle, User, Calendar as CalendarIcon, Briefcase, Clock, CalendarCheck2, PlayCircle, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL } from '@/lib/status-labels'

interface CalendarAgendaViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}

type AgendaFilterMode = 'relevant' | 'deadline_only' | 'start_only' | 'ongoing'

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

  const tabCls = (active: boolean) =>
    `px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active ? 'bg-card text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
    }`

  const tabs: { key: AgendaFilterMode; label: string }[] = [
    { key: 'relevant', label: 'Mulai / Deadline Hari Ini' },
    { key: 'deadline_only', label: `Deadline Saja (${metrics.deadlineTodayCount})` },
    { key: 'start_only', label: `Mulai Saja (${metrics.startTodayCount})` },
    { key: 'ongoing', label: `Semua Berjalan (${metrics.totalActive})` },
  ]

  return (
    <div className="flex-1 p-5 space-y-5">
      {/* Header Agenda & Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg bg-muted border border-border">
        <div className="min-w-0">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Agenda Harian
          </span>
          <h3 className="text-base font-bold text-foreground mt-0.5">
            {dateLabel}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Fokus pada Action Plan yang <strong className="text-foreground font-semibold">jatuh tempo</strong> atau <strong className="text-foreground font-semibold">dimulai</strong> pada tanggal ini.
          </p>
        </div>

        {/* Metrik cards */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-md bg-card border border-border text-center min-w-[70px]">
            <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold block">Deadline Hari Ini</span>
            <span className="text-xs font-bold font-mono tabular-nums text-amber-700 dark:text-amber-300">{metrics.deadlineTodayCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-card border border-border text-center min-w-[70px]">
            <span className="text-xs text-fg-secondary font-semibold block">Mulai Hari Ini</span>
            <span className="text-xs font-bold font-mono tabular-nums text-foreground">{metrics.startTodayCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-card border border-border text-center min-w-[70px]">
            <span className="text-xs text-muted-foreground font-medium block">Total Aktif</span>
            <span className="text-xs font-bold font-mono tabular-nums text-foreground">{metrics.totalActive}</span>
          </div>
          {metrics.overdueCount > 0 && (
            <div className="px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-center min-w-[70px]">
              <span className="text-xs text-destructive-text font-semibold block">Overdue</span>
              <span className="text-xs font-bold font-mono tabular-nums text-destructive-text">{metrics.overdueCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Mode Tabs */}
      <div role="tablist" aria-label="Filter agenda" className="flex flex-wrap items-center gap-1 bg-muted p-1 rounded-md border border-border w-fit max-w-full">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={filterMode === t.key}
            onClick={() => setFilterMode(t.key)}
            className={tabCls(filterMode === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List Action Plan Kronologis */}
      <div className="space-y-3">
        {displayedItems.length === 0 ? (
          <div className="py-16 px-4 text-center border-2 border-dashed border-border rounded-lg">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">
              Belum ada Action Plan pada filter ini.
            </p>
            {filterMode !== 'ongoing' && (
              <button
                type="button"
                onClick={() => setFilterMode('ongoing')}
                className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Tampilkan semua berjalan
              </button>
            )}
          </div>
        ) : (
          displayedItems.map(({ event: ev, isStartToday, isDeadlineToday }) => {
            const isOverdue = ev.status === 'OVERDUE'
            const displayCode = ev.code ?? ev.id.slice(0, 6).toUpperCase()

            return (
              <div
                key={ev.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectEvent(ev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectEvent(ev)
                  }
                }}
                className="group p-4 rounded-lg border border-border bg-card shadow-2xs dark:shadow-none hover:border-input transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono tabular-nums text-xs font-semibold px-2 py-0.5 rounded-sm bg-muted text-fg-secondary border border-border">
                      {displayCode}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {isOverdue && <AlertTriangle className="h-3 w-3 text-destructive-text" aria-hidden="true" />}
                      <StatusBadge status={ev.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
                    </span>
                    {isDeadlineToday && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-sm border border-amber-200 dark:border-amber-800">
                        <CalendarCheck2 size={12} aria-hidden="true" />
                        Deadline Hari Ini
                      </span>
                    )}
                    {isStartToday && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-fg-secondary bg-muted px-2 py-0.5 rounded-sm border border-border">
                        <PlayCircle size={12} aria-hidden="true" />
                        Mulai Hari Ini
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {ev.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User size={13} aria-hidden="true" />
                      <span>{ev.picName}</span>
                      {ev.labelName && ev.labelName !== '-' && (
                        <span className="text-xs">({ev.labelName})</span>
                      )}
                    </div>
                    {ev.projectName && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Briefcase size={13} aria-hidden="true" />
                        <span>{ev.projectName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={13} aria-hidden="true" />
                      <span className="font-mono tabular-nums">
                        {new Date(ev.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} s/d{' '}
                        {new Date(ev.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-foreground group-hover:underline underline-offset-2">
                    Lihat Detail
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
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
