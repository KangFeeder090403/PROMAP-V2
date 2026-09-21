/**
 * Utilitas Kalkulasi Geometri & Skala Waktu untuk Native ProMaP Roadmap
 * Bebas dependensi eksternal, presisi tinggi, dan anti scroll-trap.
 */

export type RoadmapViewMode = 'Day' | 'Week' | 'Month'

export interface TimelineViewport {
  start: Date
  end: Date
  totalDurationMs: number
}

export interface TimelineTick {
  id: string
  label: string
  subLabel?: string
  start: Date
  end: Date
  isWeekend?: boolean
  isCurrent?: boolean
}

export interface ProjectBarGeometry {
  leftPercent: number
  widthPercent: number
  isVisibleInViewport: boolean
  isBeforeViewport: boolean
  isAfterViewport: boolean
}

/**
 * Normalisasi tanggal ke awal hari (00:00:00.000)
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Normalisasi tanggal ke akhir hari (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Menghitung rentang tanggal viewport linimasa berdasarkan viewMode dan tanggal anchor
 */
export function getTimelineViewport(anchorDate: Date, viewMode: RoadmapViewMode): TimelineViewport {
  const base = startOfDay(anchorDate)

  if (viewMode === 'Day') {
    // 14 hari: 3 hari sebelum, 10 hari sesudah
    const start = new Date(base)
    start.setDate(start.getDate() - 3)

    const end = new Date(base)
    end.setDate(end.getDate() + 11)
    end.setHours(23, 59, 59, 999)

    return {
      start,
      end,
      totalDurationMs: end.getTime() - start.getTime(),
    }
  }

  if (viewMode === 'Week') {
    // 8 pekan (56 hari): mundur 1 pekan ke awal Senin, maju 7 pekan
    const dayOfWeek = base.getDay() // 0 = Minggu
    const diffToMonday = (dayOfWeek + 6) % 7 // offset ke Senin
    const start = new Date(base)
    start.setDate(start.getDate() - diffToMonday - 7)

    const end = new Date(start)
    end.setDate(end.getDate() + 56 - 1)
    end.setHours(23, 59, 59, 999)

    return {
      start,
      end,
      totalDurationMs: end.getTime() - start.getTime(),
    }
  }

  // Month mode: 6 bulan (mundur 1 bulan, maju 5 bulan)
  const start = new Date(base.getFullYear(), base.getMonth() - 1, 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 5, 0, 23, 59, 59, 999)

  return {
    start,
    end,
    totalDurationMs: end.getTime() - start.getTime(),
  }
}

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/**
 * Menghasilkan array ticks untuk kolom header grid linimasa
 */
export function generateTimelineTicks(viewport: TimelineViewport, viewMode: RoadmapViewMode): TimelineTick[] {
  const ticks: TimelineTick[] = []
  const today = startOfDay(new Date())

  if (viewMode === 'Day') {
    const curr = new Date(viewport.start)
    while (curr.getTime() <= viewport.end.getTime()) {
      const dayStart = startOfDay(curr)
      const dayEnd = endOfDay(curr)
      const isWeekend = curr.getDay() === 0 || curr.getDay() === 6
      const isCurrent = dayStart.getTime() === today.getTime()

      ticks.push({
        id: `day-${curr.toISOString().split('T')[0]}`,
        label: `${curr.getDate()} ${MONTH_NAMES_ID[curr.getMonth()]}`,
        subLabel: DAY_NAMES_ID[curr.getDay()],
        start: dayStart,
        end: dayEnd,
        isWeekend,
        isCurrent,
      })

      curr.setDate(curr.getDate() + 1)
    }
    return ticks
  }

  if (viewMode === 'Week') {
    const curr = new Date(viewport.start)
    let weekIndex = 1
    while (curr.getTime() <= viewport.end.getTime()) {
      const weekStart = new Date(curr)
      const weekEnd = new Date(curr)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const isCurrent = today.getTime() >= weekStart.getTime() && today.getTime() <= weekEnd.getTime()

      ticks.push({
        id: `week-${weekStart.toISOString().split('T')[0]}`,
        label: `W${weekIndex}`,
        subLabel: `${weekStart.getDate()} ${MONTH_NAMES_ID[weekStart.getMonth()]}`,
        start: weekStart,
        end: weekEnd,
        isCurrent,
      })

      weekIndex++
      curr.setDate(curr.getDate() + 7)
    }
    return ticks
  }

  // Month mode
  const currYear = viewport.start.getFullYear()
  const currMonth = viewport.start.getMonth()
  const endYear = viewport.end.getFullYear()
  const endMonth = viewport.end.getMonth()

  const totalMonths = (endYear - currYear) * 12 + (endMonth - currMonth) + 1

  for (let i = 0; i < totalMonths; i++) {
    const mStart = new Date(currYear, currMonth + i, 1)
    const mEnd = new Date(currYear, currMonth + i + 1, 0, 23, 59, 59, 999)
    const isCurrent = today.getFullYear() === mStart.getFullYear() && today.getMonth() === mStart.getMonth()

    ticks.push({
      id: `month-${mStart.getFullYear()}-${mStart.getMonth()}`,
      label: MONTH_NAMES_ID[mStart.getMonth()],
      subLabel: `${mStart.getFullYear()}`,
      start: mStart,
      end: mEnd,
      isCurrent,
    })
  }

  return ticks
}

/**
 * Menghitung posisi geometri bar proyek (persentase left & width)
 */
export function calculateProjectBarGeometry(
  startDate: Date | string,
  endDate: Date | string | null | undefined,
  viewport: TimelineViewport
): ProjectBarGeometry {
  const pStart = startOfDay(new Date(startDate)).getTime()
  let pEnd = endDate ? endOfDay(new Date(endDate)).getTime() : pStart + 45 * 24 * 60 * 60 * 1000

  if (pEnd <= pStart) {
    pEnd = pStart + 30 * 24 * 60 * 60 * 1000
  }

  const vStart = viewport.start.getTime()
  const vEnd = viewport.end.getTime()
  const vDuration = viewport.totalDurationMs

  const isBeforeViewport = pEnd < vStart
  const isAfterViewport = pStart > vEnd
  const isVisibleInViewport = !isBeforeViewport && !isAfterViewport

  // Clamping untuk rentang yang terlihat di dalam viewport
  const visibleStart = Math.max(vStart, pStart)
  const visibleEnd = Math.min(vEnd, pEnd)

  const rawLeft = ((visibleStart - vStart) / vDuration) * 100
  const rawWidth = Math.max(2, ((visibleEnd - visibleStart) / vDuration) * 100)

  const leftPercent = Math.max(0, Math.min(98, rawLeft))
  const widthPercent = Math.min(100 - leftPercent, rawWidth)

  return {
    leftPercent,
    widthPercent,
    isVisibleInViewport,
    isBeforeViewport,
    isAfterViewport,
  }
}

/**
 * Menghitung persentase posisi horizontal garis hari ini (Today Marker)
 */
export function calculateTodayPositionPercent(viewport: TimelineViewport): number | null {
  const now = new Date().getTime()
  const vStart = viewport.start.getTime()
  const vEnd = viewport.end.getTime()

  if (now < vStart || now > vEnd) return null

  return ((now - vStart) / viewport.totalDurationMs) * 100
}
