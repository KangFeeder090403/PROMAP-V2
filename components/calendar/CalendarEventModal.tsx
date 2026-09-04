'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL } from '@/lib/status-labels'
import type { CalendarEvent } from '@/lib/calendar-grid'

export function CalendarEventModal({
  event,
  onClose,
}: {
  event: CalendarEvent | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {event && (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <Field label="PIC" value={event.picName} />
              <Field label="Label Jabatan" value={event.labelName} />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p>
                <StatusBadge status={event.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
              </div>
              <Field label="Project" value={event.projectName} />
              <Field label="Divisi" value={event.divisionName} />
              <Field
                label="Deadline"
                value={new Date(event.endDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-slate-800">{value}</p>
    </div>
  )
}
