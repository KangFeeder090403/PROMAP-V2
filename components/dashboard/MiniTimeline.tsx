'use client'

import { CalendarRange } from 'lucide-react'
import { AP_STATUS_BAR_COLOR, AP_STATUS_LABEL } from '@/lib/status-labels'
import {
  calculateProjectBarGeometry,
  calculateTodayPositionPercent,
  generateTimelineTicks,
  getTimelineViewport,
} from '@/lib/roadmap-timeline'
import type { TrackerRow, UpcomingMilestone } from '@/lib/types/dashboard'

const MAX_ROWS = 8

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function MiniTimeline({
  rows,
  milestones = [],
  onOpen,
}: {
  rows: TrackerRow[]
  milestones?: UpcomingMilestone[]
  onOpen: (id: string) => void
}) {
  // 14 hari: 3 hari lalu s.d. 10 hari ke depan.
  const viewport = getTimelineViewport(new Date(), 'Day')
  const ticks = generateTimelineTicks(viewport, 'Day')
  const todayPct = calculateTodayPositionPercent(viewport)

  const bars = rows
    .filter((r) => r.startDate && r.deadline)
    .map((r) => ({ r, g: calculateProjectBarGeometry(r.startDate!, r.deadline, viewport) }))
    .filter(({ g }) => g.isVisibleInViewport)
    .slice(0, MAX_ROWS)

  const marks = milestones
    .map((m) => ({ m, t: +new Date(m.endDate) }))
    .filter(({ t }) => t >= viewport.start.getTime() && t <= viewport.end.getTime())
    .map(({ m, t }) => ({ m, left: ((t - viewport.start.getTime()) / viewport.totalDurationMs) * 100 }))

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none w-full min-w-0 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <CalendarRange className="h-4 w-4 text-fg-secondary shrink-0" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">Linimasa 14 Hari</h2>
        {marks.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-0.5 bg-foreground" aria-hidden="true" /> Milestone proyek
          </span>
        )}
      </div>

      {bars.length === 0 && marks.length === 0 ? (
        <p className="py-10 px-4 text-center text-sm text-muted-foreground">Tidak ada jadwal 14 hari ke depan.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px] px-4 py-3">
            {/* Header tanggal */}
            <div className="grid grid-cols-[10rem_1fr] gap-3">
              <span />
              <div className="grid" style={{ gridTemplateColumns: `repeat(${ticks.length}, minmax(0, 1fr))` }}>
                {ticks.map((t) => (
                  <span
                    key={t.id}
                    className={`text-center text-xs leading-tight tabular-nums ${
                      t.isCurrent ? 'font-semibold text-foreground' : t.isWeekend ? 'text-muted-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {t.subLabel}
                    <br />
                    {t.start.getDate()}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mt-2 min-h-7 space-y-1.5">
              {bars.map(({ r, g }) => (
                <div key={r.id} className="grid grid-cols-[10rem_1fr] gap-3 items-center h-7">
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className="truncate text-left text-xs text-fg-secondary hover:text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={r.title}
                  >
                    {r.title}
                  </button>
                  <div className="relative h-full rounded-sm bg-muted/50">
                    <button
                      type="button"
                      onClick={() => onOpen(r.id)}
                      aria-label={`${r.title}, ${AP_STATUS_LABEL[r.status] ?? r.status}, tenggat ${r.deadline ? fmt(r.deadline) : '—'}`}
                      title={`${r.title} · ${AP_STATUS_LABEL[r.status] ?? r.status}`}
                      className="absolute top-1.5 bottom-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        left: `${g.leftPercent}%`,
                        width: `${g.widthPercent}%`,
                        backgroundColor: AP_STATUS_BAR_COLOR[r.status],
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Overlay: garis hari ini + milestone, sejajar kolom track */}
              <div className="pointer-events-none absolute inset-y-0 left-[calc(10rem+0.75rem)] right-0">
                {todayPct !== null && (
                  <span className="absolute inset-y-0 w-px bg-primary" style={{ left: `${todayPct}%` }} aria-hidden="true" />
                )}
                {marks.map(({ m, left }, i) => (
                  <span
                    key={`${m.projectId}-${i}`}
                    title={`${m.projectName}: ${m.title} (${fmt(m.endDate)})`}
                    className="pointer-events-auto absolute -top-1 h-3 w-0.5 bg-foreground"
                    style={{ left: `${left}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
