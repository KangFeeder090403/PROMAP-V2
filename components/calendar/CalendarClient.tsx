'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { GanttBar } from '@/components/calendar/GanttBar'
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal'
import { getMonthGrid, computeWeekSegments, fmtISO, type CalendarEvent } from '@/lib/calendar-grid'

const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function CalendarClient() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)

  const weeks = useMemo(() => getMonthGrid(currentMonth), [currentMonth])
  const gridFrom = weeks[0][0]
  const gridTo = weeks[weeks.length - 1][6]

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/calendar?from=${fmtISO(gridFrom)}&to=${fmtISO(gridTo)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Gagal memuat data')
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setEvents(data)
      })
      .catch(() => {
        if (!cancelled) setError('Terjadi kesalahan. Coba lagi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [gridFrom.getTime(), gridTo.getTime()])

  function goMonth(offset: number) {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + offset)
      return d
    })
  }

  const monthLabel = currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const exportHref = `/api/calendar/export?from=${fmtISO(gridFrom)}&to=${fmtISO(gridTo)}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Kalender</h1>
        <a
          href={exportHref}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-[15px] font-medium text-slate-800">{monthLabel}</p>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading && !events && <p className="text-sm text-slate-500">Memuat...</p>}

        {(!loading || events) && (
          <div className="border-l border-t border-slate-200">
            <div className="grid grid-cols-7">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="border-r border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide text-center"
                >
                  {label}
                </div>
              ))}
            </div>

            {weeks.map((week, wi) => {
              const segments = computeWeekSegments(week, events ?? [])
              const laneCount = segments.reduce((max, s) => Math.max(max, s.lane + 1), 0)

              return (
                <div
                  key={wi}
                  className="grid grid-cols-7"
                  style={{ gridAutoRows: 'auto' }}
                >
                  {week.map((date, di) => {
                    const inMonth = date.getMonth() === currentMonth.getMonth()
                    const isToday = fmtISO(date) === fmtISO(new Date())
                    return (
                      <div
                        key={di}
                        style={{ gridColumn: di + 1, gridRow: 1 }}
                        className="border-r border-b border-slate-200 px-1.5 py-1 min-h-[28px]"
                      >
                        <span
                          className={`text-xs ${
                            isToday
                              ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500 text-white font-medium'
                              : inMonth
                              ? 'text-slate-700'
                              : 'text-slate-300'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                      </div>
                    )
                  })}

                  {segments.map((seg) => (
                    <div
                      key={`${seg.event.id}-${seg.colStart}`}
                      style={{ gridColumn: `${seg.colStart} / span ${seg.colSpan}`, gridRow: 2 + seg.lane }}
                      className="px-1.5 pb-1"
                    >
                      <GanttBar event={seg.event} onClick={() => setSelected(seg.event)} />
                    </div>
                  ))}

                  {/* Sel kosong pengisi border bawah kalau tidak ada bar di baris ini */}
                  {laneCount === 0 && (
                    <div style={{ gridColumn: '1 / span 7', gridRow: 2 }} className="h-1" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CalendarEventModal event={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
