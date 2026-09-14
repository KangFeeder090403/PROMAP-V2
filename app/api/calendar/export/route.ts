import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { shortRef } from '@/lib/dashboard-aggregate'
import { buildCalendarWhere, resolveDateRange } from '@/lib/calendar-query'
import { chunkIntoWeeks, computeWeekSegments, fmtISO, type CalendarEvent } from '@/lib/calendar-grid'
import { AP_STATUS_LABEL } from '@/lib/status-labels'

// RGB fill per status — sama dengan token warna solid GanttBar (lib SOLID_BAR_CLASS di
// components/calendar/GanttBar.tsx), ditulis ulang di sini sebagai RGB karena jsPDF
// butuh angka, bukan class Tailwind. Overdue & Evidence Required sengaja 1 warna
// (amber #F59E0B) — keterbatasan design-system existing, dibedakan lewat label legend.
const STATUS_FILL: Record<string, [number, number, number]> = {
  NOT_STARTED: [100, 116, 139], // slate-500
  IN_PROGRESS: [59, 130, 246], // blue-500
  PENDING_APPROVAL: [99, 102, 241], // indigo-500
  EVIDENCE_REQUIRED: [245, 158, 11], // amber-500
  APPROVED: [34, 197, 94], // green-500
  REJECTED: [239, 68, 68], // red-500
  OVERDUE: [245, 158, 11], // amber-500 (sama dgn Evidence Required)
  COMPLETE: [16, 185, 129], // emerald-500
}

const LEGEND_ORDER = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'EVIDENCE_REQUIRED',
  'APPROVED',
  'REJECTED',
  'OVERDUE',
  'COMPLETE',
] as const

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

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
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

    const rows = await prisma.actionPlan.findMany({
      where,
      include: {
        pic: { select: { name: true, userLabel: { select: { name: true } } } },
        task: { select: { project: { select: { name: true } } } },
        division: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    })

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
      projectName: ap.task?.project.name ?? 'Personal',
      divisionName: ap.division?.name ?? '-',
    }))

    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 10

    doc.setFontSize(14)
    doc.text(`Kalender Action Plan - ${fmtISO(from)} s/d ${fmtISO(to)}`, margin, margin)

    const contentTop = margin + 8
    const leftW = (pageW - margin * 2) * 0.4
    const rightW = (pageW - margin * 2) * 0.6 - 4
    const rightX = margin + leftW + 4

    // ── Kolom kiri: tabel manual ──────────────────────────────
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    let ty = contentTop + 4
    const col = { title: margin, pic: margin + 55, start: margin + 90, end: margin + 112 }
    doc.text('Nama AP', col.title, ty)
    doc.text('PIC', col.pic, ty)
    doc.text('Start', col.start, ty)
    doc.text('End', col.end, ty)
    ty += 1.5
    doc.line(margin, ty, margin + leftW, ty)
    ty += 4
    doc.setFont('helvetica', 'normal')

    const rowH = 5
    const maxTy = pageH - margin
    for (const ev of events) {
      if (ty > maxTy) break // halaman tunggal — kelebihan baris dipotong (ponytail di bawah)
      const title = ev.title.length > 28 ? ev.title.slice(0, 25) + '...' : ev.title
      const pic = ev.picName.length > 16 ? ev.picName.slice(0, 13) + '...' : ev.picName
      doc.text(title, col.title, ty)
      doc.text(pic, col.pic, ty)
      doc.text(fmtISO(new Date(ev.startDate)), col.start, ty)
      doc.text(fmtISO(new Date(ev.endDate)), col.end, ty)
      ty += rowH
    }

    // ── Kolom kanan: grid kalender visual ─────────────────────
    const weeks = chunkIntoWeeks(from, to)
    const cellW = rightW / 7
    const legendH = 24
    const gridH = pageH - contentTop - margin - legendH
    const cellH = Math.min(22, gridH / weeks.length)
    let gy = contentTop

    doc.setFontSize(7)
    weeks.forEach((week, wi) => {
      const segments = computeWeekSegments(week, events)
      week.forEach((date, di) => {
        const cx = rightX + di * cellW
        doc.setDrawColor(226, 232, 240) // slate-200
        doc.rect(cx, gy, cellW, cellH)
        doc.setTextColor(100, 116, 139)
        doc.text(String(date.getDate()), cx + 1, gy + 3)
      })

      segments.forEach((seg) => {
        if (seg.lane > 2) return // maks 3 lane per baris muat di cellH — kelebihan tetap ada di tabel kiri
        const bx = rightX + (seg.colStart - 1) * cellW + 0.5
        const bw = seg.colSpan * cellW - 1
        const by = gy + 4 + seg.lane * 5
        if (by + 4 > gy + cellH) return
        const [r, g, b] = STATUS_FILL[seg.event.status] ?? [100, 116, 139]
        doc.setFillColor(r, g, b)
        doc.rect(bx, by, bw, 4, 'F')
      })

      gy += cellH
    })

    // ── Legend ─────────────────────────────────────────────────
    let lx = rightX
    let ly = gy + 6
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text('Legend:', lx, ly)
    ly += 4
    LEGEND_ORDER.forEach((s, i) => {
      const [r, g, b] = STATUS_FILL[s]
      const colX = lx + (i % 2) * (rightW / 2)
      const rowY = ly + Math.floor(i / 2) * 4.5
      doc.setFillColor(r, g, b)
      doc.rect(colX, rowY - 2.5, 3, 3, 'F')
      doc.setTextColor(15, 23, 42)
      doc.text(`- ${AP_STATUS_LABEL[s]}`, colX + 4.5, rowY)
    })

    const filename = `calendar-${fmtISO(from)}-${fmtISO(to)}.pdf`
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
