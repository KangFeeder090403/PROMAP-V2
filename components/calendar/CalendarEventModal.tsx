'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL, AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import type { CalendarEvent } from '@/lib/calendar-grid'
import { Calendar, User, Briefcase, Building2, AlertTriangle, ArrowUpRight, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function CalendarEventModal({
  event,
  onClose,
}: {
  event: CalendarEvent | null
  onClose: () => void
}) {
  if (!event) return null

  const isOverdue = event.status === 'OVERDUE'
  const displayCode = event.code ?? event.id.slice(0, 6).toUpperCase()
  const startDateStr = new Date(event.startDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const endDateStr = new Date(event.endDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-card border border-border rounded-lg shadow-xl text-foreground">
        <DialogHeader className="space-y-1.5 pb-4 border-b border-border text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono tabular-nums text-xs font-semibold px-2 py-0.5 rounded-sm bg-muted text-fg-secondary border border-border">
              {displayCode}
            </span>
            <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold ${AP_PRIORITY_STYLE[event.priority]}`}>
              {AP_PRIORITY_LABEL[event.priority] ?? event.priority}
            </span>
            <span className="inline-flex items-center gap-1">
              {isOverdue && <AlertTriangle className="h-3 w-3 text-destructive-text" aria-hidden="true" />}
              <StatusBadge status={event.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground leading-snug">
            {event.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Jadwal komitmen kerja dan target penyelesaian Action Plan
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs">
          {/* PIC Card */}
          <div className="p-3 rounded-lg bg-muted border border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold mb-1">
              <User size={13} aria-hidden="true" />
              <span>PENANGGUNG JAWAB (PIC)</span>
            </div>
            <p className="font-bold text-sm text-foreground">{event.picName || '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {event.labelName && event.labelName !== '-' ? event.labelName : 'Anggota Tim'}
            </p>
          </div>

          {/* Project & Division Card */}
          <div className="p-3 rounded-lg bg-muted border border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold mb-1">
              <Briefcase size={13} aria-hidden="true" />
              <span>PROJECT &amp; DIVISI</span>
            </div>
            <p className="font-bold text-sm text-foreground truncate">
              {event.projectName || '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building2 size={11} aria-hidden="true" />
              <span>{event.divisionName || 'Semua Divisi'}</span>
            </p>
          </div>

          {/* Timeline Range Card */}
          <div className="sm:col-span-2 p-3 rounded-lg bg-muted border border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold mb-1.5">
              <Calendar size={13} aria-hidden="true" />
              <span>RENTANG WAKTU &amp; DEADLINE</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs text-muted-foreground block">Mulai</span>
                <span className="font-medium font-mono tabular-nums text-foreground">{startDateStr}</span>
              </div>
              <ArrowRight size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
              <div>
                <span className="text-xs text-muted-foreground block">Target Selesai</span>
                <span className="font-bold font-mono tabular-nums text-foreground">{endDateStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Action */}
        <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-md border border-input bg-card text-sm font-medium text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tutup
          </button>
          <Link
            href={`/action-plans?open=${event.id}&highlight=${event.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary hover:bg-primary-hover text-sm font-medium text-primary-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Buka Detail Lengkap</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
