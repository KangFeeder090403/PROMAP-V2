'use client'

import type { CalendarEvent } from '@/lib/calendar-grid'

// Warna solid bar Gantt, 1:1 dengan color token per status di AP_STATUS_STYLE
// (lib/status-labels.ts) tapi versi -500 solid, bukan -100 badge. Class harus
// literal (bukan di-generate via template string) supaya kedeteksi Tailwind JIT.
const SOLID_BAR_CLASS: Record<string, string> = {
  NOT_STARTED: 'bg-slate-500',
  IN_PROGRESS: 'bg-blue-500',
  PENDING_APPROVAL: 'bg-indigo-500',
  EVIDENCE_REQUIRED: 'bg-amber-500',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  // Overdue pakai token warning yang sama dengan Evidence Required (amber) —
  // keterbatasan design-system existing (chart colors token vs badge Tailwind
  // class beda utk Overdue). Label teks tetap beda, jadi tidak ambigu di UI.
  OVERDUE: 'bg-amber-500',
  COMPLETE: 'bg-emerald-500',
}

/**
 * Satu segmen Gantt bar. Posisi grid (kolom-start + span) di-set oleh wrapper
 * div milik caller (CalendarClient) — komponen ini hanya render visual bar,
 * mengisi penuh lebar wrapper-nya.
 */
export function GanttBar({
  event,
  onClick,
}: {
  event: CalendarEvent
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-5 px-2 rounded text-[11px] font-medium text-white text-left truncate hover:opacity-90 transition-opacity ${
        SOLID_BAR_CLASS[event.status] ?? 'bg-slate-500'
      }`}
      title={event.title}
    >
      {event.title}
    </button>
  )
}
