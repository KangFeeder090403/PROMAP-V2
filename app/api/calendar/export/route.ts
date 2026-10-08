import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { shortRef } from '@/lib/dashboard-aggregate'
import { buildCalendarWhere, resolveDateRange } from '@/lib/calendar-query'
import { computeWeekSegments, fmtISO, startOfDay, type CalendarEvent } from '@/lib/calendar-grid'
import { AP_STATUS_LABEL, AP_PRIORITY_LABEL } from '@/lib/status-labels'

export const dynamic = 'force-dynamic'

// Warna status selaras dengan PRD §D2 (Design System ProMaP)
const STATUS_FILL: Record<string, [number, number, number]> = {
  NOT_STARTED: [100, 116, 139],       // slate-500
  IN_PROGRESS: [14, 165, 233],        // sky-500 (= AP_STATUS_DOT)
  PENDING_APPROVAL: [79, 70, 229],     // indigo-600
  EVIDENCE_REQUIRED: [217, 119, 6],    // amber-600
  APPROVED: [22, 163, 74],            // green-600
  REJECTED: [220, 38, 38],            // red-600
  OVERDUE: [234, 88, 12],             // orange-600
  COMPLETE: [5, 150, 105],            // emerald-600
}

const PRIORITY_COLOR: Record<string, [number, number, number]> = {
  HIGH: [220, 38, 38],    // red-600
  MEDIUM: [217, 119, 6],  // amber-600
  LOW: [100, 116, 139],   // slate-500
}

const STATUS_ORDER = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'EVIDENCE_REQUIRED',
  'APPROVED',
  'REJECTED',
  'OVERDUE',
  'COMPLETE',
] as const

const DAY_NAMES = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']

function formatIndoDate(d: Date): string {
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatIndoShort(d: Date): string {
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Normalisasi rentang [from, to] menjadi minggu yang selalu diawali SENIN.
 * Memastikan 7 kolom kalender selalu tepat Senin s/d Minggu.
 */
function buildMondayAlignedWeeks(from: Date, to: Date): Date[][] {
  const start = startOfDay(from)
  const end = startOfDay(to)

  // Hitung selisih hari ke Senin terdekat sebelumnya (Senin = 0)
  const startWeekday = (start.getDay() + 6) % 7
  const gridStart = new Date(start.getTime() - startWeekday * 86400000)

  // Hitung selisih hari ke Minggu terdekat setelahnya
  const endWeekday = (end.getDay() + 6) % 7
  const gridEnd = new Date(end.getTime() + (6 - endWeekday) * 86400000)

  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1
  const numWeeks = Math.max(1, Math.ceil(totalDays / 7))

  const weeks: Date[][] = []
  for (let w = 0; w < numWeeks; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const cur = new Date(gridStart.getTime() + (w * 7 + d) * 86400000)
      week.push(cur)
    }
    weeks.push(week)
  }
  return weeks
}

function renderCalendarDayCell(
  doc: any,
  date: Date,
  di: number,
  cx: number,
  gy: number,
  colW: number,
  cellH: number,
  from: Date,
  to: Date
) {
  const isWeekend = di >= 5
  const isOutOfMonth = date.getMonth() !== from.getMonth() && date.getMonth() !== to.getMonth()

  // Background sel kalender
  doc.setFillColor(isWeekend ? 248 : 255, isWeekend ? 250 : 255, isWeekend ? 252 : 255)
  doc.setDrawColor(226, 232, 240)
  doc.rect(cx, gy, colW, cellH, 'FD')

  // Header nomor tanggal (strip atas sel agar nomor tidak tertimpa bar)
  doc.setFillColor(isWeekend ? 241 : 248, isWeekend ? 245 : 250, isWeekend ? 249 : 252)
  doc.rect(cx, gy, colW, 4, 'F')

  // Nomor tanggal
  const dateNum = String(date.getDate())
  const isFirst = date.getDate() === 1
  doc.setFont('helvetica', isFirst ? 'bold' : 'normal')
  doc.setFontSize(6.5)

  if (isOutOfMonth) {
    doc.setTextColor(160, 174, 192)
  } else if (isFirst) {
    doc.setTextColor(37, 99, 235)
  } else {
    doc.setTextColor(71, 85, 105)
  }

  const dateText = isFirst ? `${dateNum} ${formatIndoShort(date).split(' ')[1]}` : dateNum
  doc.text(dateText, cx + colW - 1.5, gy + 3, { align: 'right' })
}

function renderWeekGanttBars(
  doc: any,
  segments: any[],
  gy: number,
  margin: number,
  colW: number,
  cellH: number
) {
  const maxLanes = Math.floor((cellH - 5) / 4.2)
  segments.forEach((seg) => {
    if (seg.lane >= maxLanes) return // Batasi agar tidak meluap keluar sel
    const bx = margin + (seg.colStart - 1) * colW + 0.8
    const bw = seg.colSpan * colW - 1.6
    const by = gy + 4.6 + seg.lane * 4.2
    const barH = 3.6

    const [r, g, b] = STATUS_FILL[seg.event.status] ?? [100, 116, 139]
    doc.setFillColor(r, g, b)
    doc.roundedRect(bx, by, bw, barH, 0.8, 0.8, 'F')

    // Teks label di dalam bar
    const codePrefix = seg.event.code ? `[${seg.event.code}] ` : ''
    const fullLabel = `${codePrefix}${seg.event.title}`
    const maxChars = Math.max(6, Math.floor(bw / 1.7))
    const displayLabel = fullLabel.length > maxChars ? fullLabel.slice(0, maxChars - 1) + '…' : fullLabel

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.text(displayLabel, bx + 1.2, by + 2.5)
  })
}

function renderExecutionSummaryRow(
  doc: any,
  ap: any,
  tableY: number,
  rowHeight: number,
  margin: number,
  contentW: number,
  isEven: boolean
) {
  doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255)
  doc.rect(margin, tableY, contentW, rowHeight, 'F')
  doc.setDrawColor(241, 245, 249)
  doc.line(margin, tableY + rowHeight, margin + contentW, tableY + rowHeight)

  let tx = margin + 2

  // 1. Kode
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  doc.text(shortRef(ap.id, 'AP'), tx, tableY + 5)
  tx += 18

  // 2. Nama Action Plan
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  const safeTitle = ap.title.length > 55 ? ap.title.slice(0, 52) + '…' : ap.title
  doc.text(safeTitle, tx, tableY + 4.8)
  tx += 90

  // 3. PIC
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(30, 41, 59)
  const safePic = ap.pic.name.length > 22 ? ap.pic.name.slice(0, 20) + '…' : ap.pic.name
  doc.text(safePic, tx, tableY + 4.8)
  tx += 38

  // 4. Divisi / Project
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  const projectOrDiv = ap.division?.name ?? ap.task?.project?.name ?? 'Umum'
  const safeDiv = projectOrDiv.length > 24 ? projectOrDiv.slice(0, 22) + '…' : projectOrDiv
  doc.text(safeDiv, tx, tableY + 4.8)
  tx += 42

  // 5. Prioritas (Badge)
  const [pr, pg, pb] = PRIORITY_COLOR[ap.priority] ?? [100, 116, 139]
  doc.setFillColor(pr, pg, pb)
  doc.circle(tx + 2, tableY + 4.2, 1.2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(pr, pg, pb)
  doc.text(AP_PRIORITY_LABEL[ap.priority] ?? ap.priority, tx + 5, tableY + 4.8)
  tx += 22

  // 6. Jadwal Kerja
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(71, 85, 105)
  const dateRangeStr = `${formatIndoShort(ap.startDate)} - ${formatIndoShort(ap.endDate)}`
  doc.text(dateRangeStr, tx, tableY + 4.8)
  tx += 35

  // 7. Status Badge
  const [sr, sg, sb] = STATUS_FILL[ap.status] ?? [100, 116, 139]
  doc.setFillColor(sr, sg, sb)
  doc.roundedRect(tx, tableY + 1.8, 25, 4.2, 1, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.text(AP_STATUS_LABEL[ap.status] ?? ap.status, tx + 12.5, tableY + 4.6, { align: 'center' })
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const fromRaw = searchParams.get('from')
    const toRaw = searchParams.get('to')
    const dateRange = searchParams.get('dateRange')
    const quarter = searchParams.get('quarter')
    const yearRaw = searchParams.get('year')

    if (!fromRaw && !toRaw && !dateRange && !quarter) {
      return NextResponse.json(
        { error: 'Parameter from & to atau dateRange/quarter wajib diisi' },
        { status: 400 }
      )
    }

    const { from, to } = resolveDateRange({
      from: fromRaw,
      to: toRaw,
      dateRange,
      quarter,
      year: yearRaw,
    })

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: 'from atau to bukan tanggal valid' }, { status: 400 })
    }

    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const divisionId = searchParams.get('divisionId')
    const picId = searchParams.get('picId')
    const projectId = searchParams.get('projectId')

    const where = buildCalendarWhere(user, from, to, {
      status,
      priority,
      divisionId,
      picId,
      projectId,
    })

    const [rows, companyData] = await Promise.all([
      prisma.actionPlan.findMany({
        where,
        include: {
          pic: { select: { name: true, userLabel: { select: { name: true } } } },
          task: { select: { title: true, project: { select: { name: true } } } },
          division: { select: { name: true } },
          checklists: { select: { isDone: true } },
        },
        orderBy: [{ startDate: 'asc' }, { priority: 'desc' }],
      }),
      user.companyId
        ? prisma.company.findUnique({
            where: { id: user.companyId },
            select: { name: true },
          })
        : null,
    ])

    const companyName = companyData?.name || (user.role === 'SUPER_ADMIN' ? 'Sistem Terpadu ProMaP' : 'ProMaP Workspace')

    const events: CalendarEvent[] = rows.map((ap) => ({
      id: ap.id,
      code: shortRef(ap.id, 'AP'),
      title: ap.title,
      status: ap.status,
      priority: ap.priority,
      startDate: ap.startDate.toISOString(),
      endDate: ap.endDate.toISOString(),
      picName: ap.pic.name,
      labelName: ap.pic.userLabel?.name ?? '-',
      projectName: ap.task?.project?.name ?? (ap.isPersonal ? 'Tugas Personal' : 'Inisiatif Tim'),
      divisionName: ap.division?.name ?? 'Lintas Divisi',
    }))

    // Statistik untuk ringkasan eksekutif
    const totalEvents = events.length
    const doneEvents = events.filter((e) => e.status === 'COMPLETE' || e.status === 'APPROVED').length
    const inProgressEvents = events.filter((e) => e.status === 'IN_PROGRESS').length
    const overdueEvents = events.filter((e) => e.status === 'OVERDUE').length
    const completionPct = totalEvents > 0 ? Math.round((doneEvents / totalEvents) * 100) : 0

    // Setup dokumen PDF (A4 Landscape)
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
    const pageW = 297
    const pageH = 210
    const margin = 12
    const contentW = pageW - margin * 2 // 273mm

    // ─────────────────────────────────────────────────────────────
    // FUNGSI RENDER HEADER HALAMAN EKSEKUTIF
    // ─────────────────────────────────────────────────────────────
    const renderPageHeader = (title: string, subtitle: string) => {
      // Background Header Bar (Navy #0F172A)
      doc.setFillColor(15, 23, 42)
      doc.rect(0, 0, pageW, 20, 'F')

      // Aksen Garis Brand (Gold #D4AF37)
      doc.setFillColor(212, 175, 55)
      doc.rect(0, 20, pageW, 1.2, 'F')

      // Teks Judul
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(`ProMaP — ${title}`, margin, 9)

      // Teks Subjudul / Metadata
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(203, 213, 225)
      doc.text(subtitle, margin, 15)

      // Badge Dokumen di pojok kanan
      doc.setFillColor(30, 41, 59)
      doc.roundedRect(pageW - margin - 48, 5, 48, 10, 1.5, 1.5, 'F')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(148, 163, 184)
      doc.text('DOKUMEN RESMI OPERASIONAL', pageW - margin - 24, 11, { align: 'center' })
    }

    // ─────────────────────────────────────────────────────────────
    // HALAMAN 1: KALENDER EKSEKUSI & GANTT TIMELINE VISUAL
    // ─────────────────────────────────────────────────────────────
    renderPageHeader(
      'Jadwal & Timeline Eksekusi Action Plan',
      `${companyName} | Periode: ${formatIndoDate(from)} s/d ${formatIndoDate(to)} | Diekspor: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`
    )

    let curY = 25

    // 1. KPI Summary Banner
    doc.setFillColor(248, 250, 252) // slate-50
    doc.setDrawColor(226, 232, 240) // slate-200
    doc.roundedRect(margin, curY, contentW, 11, 2, 2, 'FD')

    const kpiItems = [
      { label: 'TOTAL ACTION PLAN', val: `${totalEvents} Item` },
      { label: 'SELESAI (COMPLETE)', val: `${doneEvents} Item (${completionPct}%)` },
      { label: 'SEDANG BERJALAN', val: `${inProgressEvents} Item` },
      { label: 'LEWAT TENGGAT (OVERDUE)', val: `${overdueEvents} Item` },
    ]
    const kpiColW = contentW / 4
    kpiItems.forEach((item, i) => {
      const kx = margin + i * kpiColW + 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(100, 116, 139)
      doc.text(item.label, kx, curY + 4)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(15, 23, 42)
      doc.text(item.val, kx, curY + 8.5)
    })

    curY += 14

    // 2. Day of Week Column Headers (SENIN - MINGGU)
    const weeks = buildMondayAlignedWeeks(from, to)
    const colW = contentW / 7 // 39mm per hari
    const dayHeaderH = 6

    doc.setFillColor(30, 41, 59) // slate-800
    doc.rect(margin, curY, contentW, dayHeaderH, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)

    DAY_NAMES.forEach((dayName, idx) => {
      const cx = margin + idx * colW + colW / 2
      doc.text(dayName, cx, curY + 4.2, { align: 'center' })
    })

    curY += dayHeaderH

    // 3. Grid Kalender & Gantt Bars
    const legendH = 14
    const availableGridH = pageH - margin - legendH - curY - 2
    const cellH = Math.min(22, Math.max(14, availableGridH / weeks.length))

    weeks.forEach((week, wi) => {
      const gy = curY + wi * cellH
      const segments = computeWeekSegments(week, events)

      week.forEach((date, di) => {
        const cx = margin + di * colW
        renderCalendarDayCell(doc, date, di, cx, gy, colW, cellH, from, to)
      })

      renderWeekGanttBars(doc, segments, gy, margin, colW, cellH)
    })

    // 4. Status Legend Box di Bawah Halaman 1
    const legendY = pageH - margin - legendH
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, legendY, contentW, legendH, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(71, 85, 105)
    doc.text('KETERANGAN STATUS KERJA & DISTRIBUSI:', margin + 4, legendY + 4)

    const statusCounts: Record<string, number> = {}
    events.forEach((e) => {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1
    })

    const legColW = (contentW - 8) / 4
    STATUS_ORDER.forEach((st, idx) => {
      const colIdx = idx % 4
      const rowIdx = Math.floor(idx / 4)
      const lx = margin + 4 + colIdx * legColW
      const ly = legendY + 7.5 + rowIdx * 4.2

      const [r, g, b] = STATUS_FILL[st]
      doc.setFillColor(r, g, b)
      doc.roundedRect(lx, ly - 2.2, 3.2, 3.2, 0.6, 0.6, 'F')

      const count = statusCounts[st] ?? 0
      doc.setFont('helvetica', count > 0 ? 'bold' : 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(count > 0 ? 15 : 100, count > 0 ? 23 : 116, count > 0 ? 42 : 139)
      doc.text(`${AP_STATUS_LABEL[st]} (${count})`, lx + 4.5, ly)
    })

    // ─────────────────────────────────────────────────────────────
    // HALAMAN 2+: BUKU DETAIL & LEDGER LENGKAP ACTION PLAN
    // ─────────────────────────────────────────────────────────────
    if (rows.length > 0) {
      doc.addPage('a4', 'l')

      let ledgerPage = 2
      const renderLedgerHeader = () => {
        renderPageHeader(
          'Rincian Komprehensif Action Plan',
          `${companyName} | Total: ${rows.length} Action Plan | Halaman ${ledgerPage}`
        )

        // Tabel Header Kolom
        const thY = 25
        doc.setFillColor(15, 23, 42) // navy-900
        doc.rect(margin, thY, contentW, 7, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)

        let tx = margin + 2
        const tableCols = [
          { name: 'KODE', w: 18 },
          { name: 'NAMA ACTION PLAN & KPI', w: 90 },
          { name: 'PIC / PENANGGUNG JAWAB', w: 38 },
          { name: 'DIVISI / PROJECT', w: 42 },
          { name: 'PRIORITAS', w: 22 },
          { name: 'JADWAL KERJA', w: 35 },
          { name: 'STATUS', w: 28 },
        ]

        tableCols.forEach((col) => {
          doc.text(col.name, tx, thY + 4.8)
          tx += col.w
        })
      }

      renderLedgerHeader()
      let tableY = 32
      const rowHeight = 7.5

      rows.forEach((ap, idx) => {
        // Cek apakah butuh halaman baru
        if (tableY + rowHeight > pageH - margin) {
          doc.addPage('a4', 'l')
          ledgerPage++
          renderLedgerHeader()
          tableY = 32
        }

        const isEven = idx % 2 === 0
        renderExecutionSummaryRow(doc, ap, tableY, rowHeight, margin, contentW, isEven)

        tableY += rowHeight
      })

      // Footer Catatan Kepatuhan di halaman terakhir
      tableY += 4
      if (tableY < pageH - 8) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(148, 163, 184)
        doc.text(
          `* Data di atas divalidasi langsung dari basis data operasional ProMaP. Seluruh hak cipta dilindungi undang-undang.`,
          margin,
          tableY + 3
        )
      }
    }

    const filename = `promap-kalender-eksekusi-${fmtISO(from)}-sd-${fmtISO(to)}.pdf`
    const pdfArrayBuffer = doc.output('arraybuffer')

    return new Response(pdfArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[CALENDAR_EXPORT_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
