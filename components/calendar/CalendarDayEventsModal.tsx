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
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar size={15} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Agenda {dateStr}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Menampilkan {events.length} Action Plan aktif pada tanggal ini
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
          {events.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <p className="text-xs text-slate-400">Tidak ada Action Plan pada tanggal ini.</p>
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
                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {ev.code ?? ev.id.slice(0, 6).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${AP_PRIORITY_STYLE[ev.priority]}`}>
                      {AP_PRIORITY_LABEL[ev.priority] ?? ev.priority}
                    </span>
                    <StatusBadge
                      status={ev.status}
                      styleMap={AP_STATUS_STYLE}
                      labelMap={AP_STATUS_LABEL}
                      className="text-[10px] px-2 py-0.5"
                    />
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {ev.title}
                </p>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User size={12} className="shrink-0 text-slate-400" />
                    <span className="truncate">{ev.picName}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="truncate">{ev.divisionName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 shrink-0 font-medium">
                    <span>Detail</span>
                    <ArrowRight size={11} />
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
