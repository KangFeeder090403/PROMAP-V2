'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL, AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import type { CalendarEvent } from '@/lib/calendar-grid'
import { Calendar, User, ArrowRight } from 'lucide-react'

export function CalendarDayEventsModal({
  open,
  onClose,
  date,
  events,
  onSelectEvent,
}: {
  open: boolean
  onClose: () => void
  date: Date | null
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}) {
  if (!date) return null

  const dateStr = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-5">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-muted text-muted-foreground border border-border flex items-center justify-center">
              <Calendar size={15} aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Agenda {dateStr}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Menampilkan {events.length} Action Plan aktif pada tanggal ini
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
          {events.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <p className="text-xs text-muted-foreground">Belum ada Action Plan pada tanggal ini.</p>
            </div>
          ) : (
            events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => {
                  onClose()
                  onSelectEvent(ev)
                }}
                className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-input hover:shadow-xs transition-all group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-mono tabular-nums text-xs font-semibold text-fg-secondary">
                    {ev.code ?? ev.id.slice(0, 6).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded-sm text-xs font-semibold ${AP_PRIORITY_STYLE[ev.priority]}`}>
                      {AP_PRIORITY_LABEL[ev.priority] ?? ev.priority}
                    </span>
                    <StatusBadge
                      status={ev.status}
                      styleMap={AP_STATUS_STYLE}
                      labelMap={AP_STATUS_LABEL}
                    />
                  </div>
                </div>

                <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:underline underline-offset-2">
                  {ev.title}
                </p>

                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User size={12} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{ev.picName}</span>
                    <span className="text-border" aria-hidden="true">·</span>
                    <span className="truncate">{ev.divisionName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-foreground shrink-0 font-medium">
                    <span>Detail</span>
                    <ArrowRight size={11} aria-hidden="true" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
