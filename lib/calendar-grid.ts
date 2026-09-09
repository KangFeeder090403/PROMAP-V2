// Helper murni (tanpa React) untuk grid kalender bulanan + potong Gantt bar
// per baris minggu. Dipakai oleh CalendarClient (browser) DAN
// app/api/calendar/export/route.ts (server, generate PDF) — satu sumber logika.

export interface CalendarEvent {
  id: string
  title: string
  status: string
  priority: string
  startDate: string
  endDate: string
  picName: string
  labelName: string
  projectName: string
  divisionName: string
}

/** Format tanggal lokal (bukan UTC) sebagai YYYY-MM-DD — hindari pergeseran zona waktu toISOString(). */
export function fmtISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfDay(d: Date) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

/** Grid 6 baris x 7 kolom (Senin-start), selalu penuh 42 sel agar layout stabil antar bulan. */
export function getMonthGrid(currentMonth: Date): Date[][] {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = (firstOfMonth.getDay() + 6) % 7 // Senin=0
  const gridStart = new Date(year, month, 1 - startWeekday)

  const weeks: Date[][] = []
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + w * 7 + d)
      week.push(date)
    }
    weeks.push(week)
  }
  return weeks
}

/** Pecah rentang [from, to] jadi baris-baris 7 hari mulai dari `from` (dipakai export PDF, from/to arbitrary). */
export function chunkIntoWeeks(from: Date, to: Date): Date[][] {
  const start = startOfDay(from)
  const end = startOfDay(to)
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  const weeks: Date[][] = []
  for (let w = 0; w * 7 < totalDays; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      week.push(date)
    }
    weeks.push(week)
  }
  return weeks
}

export interface BarSegment {
  event: CalendarEvent
  colStart: number
  colSpan: number
  lane: number
}

/** Potong event jadi 1 segmen per baris minggu yang overlap, lalu assign lane (baris stack) biar tidak tabrakan. */
export function computeWeekSegments(week: Date[], events: CalendarEvent[]): BarSegment[] {
  const weekStart = startOfDay(week[0])
  const weekEnd = startOfDay(week[6])

  const raw = events
    .map((event) => {
      const eStart = startOfDay(new Date(event.startDate))
      const eEnd = startOfDay(new Date(event.endDate))
      if (eEnd < weekStart || eStart > weekEnd) return null
      const segStart = eStart < weekStart ? weekStart : eStart
      const segEnd = eEnd > weekEnd ? weekEnd : eEnd
      const colStart = Math.round((segStart.getTime() - weekStart.getTime()) / 86400000) + 1
      const colSpan = Math.round((segEnd.getTime() - segStart.getTime()) / 86400000) + 1
      return { event, colStart, colSpan }
    })
    .filter((x): x is { event: CalendarEvent; colStart: number; colSpan: number } => x !== null)
    .sort((a, b) => a.colStart - b.colStart)

  const laneEnds: number[] = []
  return raw.map((seg) => {
    let lane = laneEnds.findIndex((end) => end < seg.colStart)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    laneEnds[lane] = seg.colStart + seg.colSpan - 1
    return { ...seg, lane }
  })
}
