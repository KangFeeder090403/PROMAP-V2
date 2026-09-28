/**
 * Helper periode kuartal untuk modul Laporan.
 * Dipakai bersama oleh /api/reports dan /api/reports/export — jangan duplikasi lagi.
 */

export function getQuarterRange(quarterStr?: string | null) {
  const now = new Date()
  let qNum = Math.floor(now.getMonth() / 3) + 1
  let qYear = now.getFullYear()

  if (quarterStr) {
    // Format "Q3-2026" atau "Q3 2026"
    const m = quarterStr.match(/Q(\d)[\s-]?(\d{4})/)
    if (m) {
      const parsedQ = Number.parseInt(m[1], 10)
      const parsedYear = Number.parseInt(m[2], 10)
      // Clamp kuartal 1-4, tahun realistis; kalau invalid fallback ke kuartal berjalan
      if (parsedQ >= 1 && parsedQ <= 4 && parsedYear >= 2000 && parsedYear <= 2100) {
        qNum = parsedQ
        qYear = parsedYear
      }
    }
  }

  const startMonth = (qNum - 1) * 3
  const start = new Date(qYear, startMonth, 1)
  const end = new Date(qYear, startMonth + 3, 0, 23, 59, 59, 999)

  const fmt = (d: Date, withYear = false) =>
    d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
    })

  return {
    start,
    end,
    label: `Q${qNum} ${qYear} (${fmt(start)} - ${fmt(end, true)})`,
    shortLabel: `Q${qNum} ${qYear}`,
    quarterLabel: `Q${qNum}-${qYear}`,
    qNum,
    qYear,
  }
}

/**
 * Filter tanggal yang benar untuk Action Plan dalam satu periode: IRISAN, bukan
 * pengurungan. AP yang mulai sebelum kuartal dan berakhir di dalamnya tetap ikut
 * terhitung — `startDate: gte` + `endDate: lte` diam-diam membuangnya.
 */
export function overlapsPeriod(start: Date, end: Date) {
  return { startDate: { lte: end }, endDate: { gte: start } }
}
