'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL, AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import type { CalendarEvent } from '@/lib/calendar-grid'
import { Calendar, User, Briefcase, Building2, AlertTriangle, ArrowUpRight } from 'lucide-react'
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
      <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-slate-900 dark:text-slate-100">
        <DialogHeader className="space-y-1.5 pb-4 border-b border-slate-100 dark:border-slate-800 text-left">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {displayCode}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${AP_PRIORITY_STYLE[event.priority]}`}>
              {AP_PRIORITY_LABEL[event.priority] ?? event.priority}
            </span>
            <StatusBadge status={event.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                <AlertTriangle size={11} />
                Overdue
              </span>
            )}
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {event.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Jadwal komitmen kerja dan target penyelesaian Action Plan
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs">
          {/* PIC Card */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold mb-1">
              <User size={13} className="text-blue-500" />
              <span>PENANGGUNG JAWAB (PIC)</span>
            </div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{event.picName || '—'}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {event.labelName && event.labelName !== '-' ? event.labelName : 'Anggota Tim'}
            </p>
          </div>

          {/* Project & Division Card */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold mb-1">
              <Briefcase size={13} className="text-indigo-500" />
              <span>PROJECT &amp; DIVISI</span>
            </div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
              {event.projectName || '—'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <Building2 size={11} />
              <span>{event.divisionName || 'Semua Divisi'}</span>
            </p>
          </div>

          {/* Timeline Range Card */}
          <div className="sm:col-span-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
              <Calendar size={13} className="text-emerald-500" />
              <span>RENTANG WAKTU &amp; DEADLINE</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">Mulai</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{startDateStr}</span>
              </div>
              <span className="text-slate-400">→</span>
              <div>
                <span className="text-[10px] text-slate-400 block">Target Selesai</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{endDateStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Action */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Tutup
          </button>
          <Link
            href={`/action-plans?open=${event.id}&highlight=${event.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <span>Buka Detail Lengkap</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
