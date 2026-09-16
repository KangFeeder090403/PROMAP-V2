import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, apScope, proposalScope } from '@/lib/rbac'
import { getQuarterRange, overlapsPeriod } from '@/lib/report-period'
import { logActivity } from '@/lib/activity-log'
import { shortRef } from '@/lib/dashboard-aggregate'
import jsPDF from 'jspdf'
import ExcelJS from 'exceljs'

// Endpoint unduh laporan.
// type=executive-pdf | evidence-csv | evidence-xlsx | workload-pdf | proposal-pdf

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'] as const
const ALLOWED_TYPES = ['executive-pdf', 'evidence-csv', 'evidence-xlsx', 'workload-pdf', 'proposal-pdf'] as const

function formatDate(d: Date) {
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(d: Date) {
  return (
    d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
}

function formatPriority(p: string) {
  if (p === 'HIGH') return 'Tinggi'
  if (p === 'LOW') return 'Rendah'
  return 'Sedang'
}

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Belum Mulai',
  IN_PROGRESS: 'Dikerjakan',
  PENDING_APPROVAL: 'Menunggu Review',
  EVIDENCE_REQUIRED: 'Bukti Tambahan',
  APPROVED: 'Disetujui',
  REJECTED: 'Perlu Revisi',
  OVERDUE: 'Terlambat',
  COMPLETE: 'Selesai',
}

function getSlaStatus(ap: { status: string; endDate: Date; updatedAt: Date }) {
  const isDone = ap.status === 'COMPLETE' || ap.status === 'APPROVED'
  const now = new Date()

  if (isDone) {
    if (ap.updatedAt <= ap.endDate) {
      return 'Selesai Tepat Waktu'
    } else {
      const diffMs = ap.updatedAt.getTime() - ap.endDate.getTime()
      const daysLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      return `Selesai Terlambat (${daysLate} Hari)`
    }
  }

  if (ap.status === 'OVERDUE' || now > ap.endDate) {
    const diffMs = now.getTime() - ap.endDate.getTime()
    const daysLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    return `Lewat Tenggat (${daysLate} Hari)`
  }

  return 'On Schedule'
}

/**
 * Sanitasi cell CSV untuk mencegah CSV Formula Injection (CWE-1236).
 * Cell yang diawali '=', '+', '-', '@', '\t', '\r' diprefix kutip satu (').
 */
function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '-'
  const str = String(value)
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const forbidden = requireRole([...ALLOWED_ROLES])(user)
  if (forbidden) return forbidden

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'executive-pdf'
  const quarter = searchParams.get('quarter')
  const divisionParam = searchParams.get('division') // division id or null/ALL

  if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json({ error: `Tipe laporan tidak dikenal: ${type}` }, { status: 400 })
  }

  const { start, end, shortLabel: quarterLabel } = getQuarterRange(quarter)
  const scope = apScope(user)

  const baseWhere: Record<string, unknown> = {
    ...scope,
    deletedAt: null,
    ...overlapsPeriod(start, end),
  }

  // Terapkan filter divisi jika aktif di UI (SUPER_ADMIN / ADMIN_OPERATIONAL)
  const hasDivisionFilter = divisionParam && divisionParam !== 'ALL' && user.role !== 'MANAGER'
  if (hasDivisionFilter) {
    baseWhere.divisionId = divisionParam
  }

  if (type === 'evidence-csv' || type === 'evidence-xlsx') {
    // ─── Evidence Compliance Log (CSV & XLSX) ───────────────────
    const aps = await prisma.actionPlan.findMany({
      where: baseWhere,
      select: {
        id: true,
        title: true,
        outcomeKpi: true,
        priority: true,
        status: true,
        evidenceLink: true,
        evaluationNote: true,
        reviewNote: true,
        isPersonal: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        pic: { select: { name: true, email: true } },
        division: { select: { name: true } },
        task: {
          select: {
            title: true,
            project: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { division: { name: 'asc' } },
        { endDate: 'asc' },
      ],
    })

    const headers = [
      'No',
      'Kode AP',
      'Judul Action Plan',
      'Outcome / Target KPI',
      'Inisiatif / Proyek',
      'Divisi',
      'PIC Penanggung Jawab',
      'Email PIC',
      'Prioritas',
      'Status Pelaksanaan',
      'Status Bukti Kerja',
      'Tautan Bukti Kerja',
      'Catatan Evaluasi PIC',
      'Catatan Review Atasan',
      'Tanggal Mulai',
      'Tenggat Waktu',
      'Kepatuhan SLA',
      'Terakhir Diperbarui',
    ]

    if (type === 'evidence-csv') {
      const rows = [
        headers,
        ...aps.map((ap, idx) => {
          const hasEv = Boolean(ap.evidenceLink && ap.evidenceLink.trim() !== '' && ap.evidenceLink.trim() !== '-')
          const projectName =
            ap.task?.project?.name ?? (ap.isPersonal ? 'Tugas Personal' : (ap.task?.title ?? 'Operasional Umum'))
          return [
            String(idx + 1),
            shortRef(ap.id, 'AP'),
            sanitizeCsvCell(ap.title),
            sanitizeCsvCell(ap.outcomeKpi || '-'),
            sanitizeCsvCell(projectName),
            sanitizeCsvCell(ap.division?.name ?? '-'),
            sanitizeCsvCell(ap.pic.name),
            sanitizeCsvCell(ap.pic.email),
            formatPriority(ap.priority),
            STATUS_LABELS[ap.status] || ap.status,
            hasEv ? 'Sudah Unggah' : 'Belum Ada Bukti',
            sanitizeCsvCell(ap.evidenceLink ?? '-'),
            sanitizeCsvCell(ap.evaluationNote ?? '-'),
            sanitizeCsvCell(ap.reviewNote ?? '-'),
            formatDate(ap.startDate),
            formatDate(ap.endDate),
            getSlaStatus(ap),
            formatDateTime(ap.updatedAt),
          ]
        }),
      ]

      // Format RFC-4180 dengan pemisah koma
      const csvBody = rows
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n')

      // \uFEFF + sep=,\r\n memberitahu Microsoft Excel di Windows (locale apapun) untuk otomatis membagi kolom pakai koma
      const csvContent = '\uFEFFsep=,\r\n' + csvBody

      await logActivity({
        userId: user.id,
        action: 'UPDATED',
        newValue: `Unduh CSV bukti kerja periode ${quarterLabel}`,
      })

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="evidence-compliance-${quarterLabel.replace(' ', '-')}.csv"`,
        },
      })
    }

    if (type === 'evidence-xlsx') {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'ProMaP System'
      workbook.lastModifiedBy = user.name || 'ProMaP'
      workbook.created = new Date()
      workbook.modified = new Date()

      const sheet = workbook.addWorksheet('Bukti Kerja & Kepatuhan', {
        views: [{ state: 'frozen', ySplit: 4 }],
        properties: { tabColor: { argb: 'FF0F172A' } },
      })

      // Baris 1: Judul Utama
      sheet.mergeCells('A1:R1')
      const titleCell = sheet.getCell('A1')
      titleCell.value = 'LAPORAN DAFTAR BUKTI KERJA & KEPATUHAN ACTION PLAN'
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' },
      }
      titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      sheet.getRow(1).height = 32

      // Baris 2: Subtitle Informasi Periode
      sheet.mergeCells('A2:R2')
      const subCell = sheet.getCell('A2')
      const divLabel = hasDivisionFilter ? (aps[0]?.division?.name ?? 'Divisi Terpilih') : 'Seluruh Divisi'
      subCell.value = `Periode: ${quarterLabel}   |   Divisi: ${divLabel}   |   Total Data: ${aps.length} Action Plan   |   Digenerate: ${formatDateTime(new Date())}`
      subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } }
      subCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      }
      subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      sheet.getRow(2).height = 20

      // Baris 3: Spacer
      sheet.getRow(3).height = 6

      // Baris 4: Header Kolom
      const headerRow = sheet.getRow(4)
      headerRow.values = headers
      headerRow.height = 28

      headers.forEach((_, idx) => {
        const colNum = idx + 1
        const cell = headerRow.getCell(colNum)
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' },
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF334155' } },
          left: { style: 'thin', color: { argb: 'FF334155' } },
          bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
          right: { style: 'thin', color: { argb: 'FF334155' } },
        }
      })

      // Pasang AutoFilter di baris 4
      sheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4, column: headers.length },
      }

      // Baris Data (mulai baris 5)
      aps.forEach((ap, idx) => {
        const rowIdx = 5 + idx
        const row = sheet.getRow(rowIdx)
        row.height = 24

        const hasEv = Boolean(ap.evidenceLink && ap.evidenceLink.trim() !== '' && ap.evidenceLink.trim() !== '-')
        const projectName =
          ap.task?.project?.name ?? (ap.isPersonal ? 'Tugas Personal' : (ap.task?.title ?? 'Operasional Umum'))
        const sla = getSlaStatus(ap)
        const statusLabel = STATUS_LABELS[ap.status] || ap.status

        row.values = [
          idx + 1,
          shortRef(ap.id, 'AP'),
          ap.title,
          ap.outcomeKpi || '-',
          projectName,
          ap.division?.name ?? '-',
          ap.pic.name,
          ap.pic.email,
          formatPriority(ap.priority),
          statusLabel,
          hasEv ? 'Sudah Unggah' : 'Belum Ada Bukti',
          hasEv ? ap.evidenceLink : '-',
          ap.evaluationNote || '-',
          ap.reviewNote || '-',
          formatDate(ap.startDate),
          formatDate(ap.endDate),
          sla,
          formatDateTime(ap.updatedAt),
        ]

        const isEven = idx % 2 === 1
        const bgArgb = isEven ? 'FFF8FAFC' : 'FFFFFFFF'

        for (let c = 1; c <= headers.length; c++) {
          const cell = row.getCell(c)
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FF0F172A' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgArgb },
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          }

          // Alignment logic
          if ([1, 2, 9, 10, 11, 15, 16, 17, 18].includes(c)) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' }
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
          }

          // Highlight Status Bukti (Kolom 11)
          if (c === 11) {
            if (hasEv) {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF059669' } }
            } else {
              cell.font = { name: 'Arial', size: 9, color: { argb: 'FFDC2626' } }
            }
          }

          // Highlight Status Pelaksanaan (Kolom 10)
          if (c === 10) {
            if (ap.status === 'COMPLETE' || ap.status === 'APPROVED') {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF059669' } }
            } else if (ap.status === 'OVERDUE') {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFDC2626' } }
            } else if (ap.status === 'PENDING_APPROVAL') {
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF4F46E5' } }
            }
          }

          // Hyperlink untuk Bukti Kerja (Kolom 12)
          if (c === 12 && hasEv && ap.evidenceLink?.startsWith('http')) {
            cell.value = {
              text: 'Buka Link Bukti ↗',
              hyperlink: ap.evidenceLink,
              tooltip: ap.evidenceLink,
            }
            cell.font = { name: 'Arial', size: 9, color: { argb: 'FF2563EB' }, underline: true }
          }
        }
      })

      // Column widths
      sheet.columns = [
        { width: 6 }, // No
        { width: 12 }, // Kode AP
        { width: 34 }, // Judul Action Plan
        { width: 28 }, // Outcome / Target KPI
        { width: 24 }, // Inisiatif / Proyek
        { width: 18 }, // Divisi
        { width: 20 }, // PIC
        { width: 24 }, // Email PIC
        { width: 12 }, // Prioritas
        { width: 18 }, // Status Pelaksanaan
        { width: 18 }, // Status Bukti
        { width: 22 }, // Tautan Bukti
        { width: 30 }, // Catatan Evaluasi PIC
        { width: 30 }, // Catatan Review Atasan
        { width: 14 }, // Tgl Mulai
        { width: 14 }, // Tenggat Waktu
        { width: 24 }, // Kepatuhan SLA
        { width: 18 }, // Terakhir Diperbarui
      ]

      const buffer = await workbook.xlsx.writeBuffer()

      await logActivity({
        userId: user.id,
        action: 'UPDATED',
        newValue: `Unduh Excel (.xlsx) bukti kerja periode ${quarterLabel}`,
      })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="evidence-compliance-${quarterLabel.replace(' ', '-')}.xlsx"`,
        },
      })
    }
  }

  // ─── PDF Reports (executive / workload / proposal) ────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18
  const contentW = pageW - margin * 2

  const renderHeader = (pageTitle: string) => {
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pageW, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`ProMaP — ${pageTitle}`, margin, 13)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`${quarterLabel} | Dibuat: ${formatDate(new Date())}`, margin, 21)
    doc.text('Rahasia — untuk keperluan internal', pageW - margin, 21, { align: 'right' })
  }

  renderHeader('Laporan Kinerja')
  let y = 40

  if (type === 'executive-pdf') {
    // ─── Executive Summary ─────────────────────────────────────
    const allAPs = await prisma.actionPlan.findMany({
      where: baseWhere,
      select: {
        status: true,
        evidenceLink: true,
      },
    })

    const totalCount = allAPs.length
    const completedCount = allAPs.filter((a) => a.status === 'COMPLETE').length
    const overdueCount = allAPs.filter((a) => a.status === 'OVERDUE').length
    const evidencedCount = allAPs.filter((a) => Boolean(a.evidenceLink && a.evidenceLink.trim() !== '')).length

    const realizationPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const compliancePct = totalCount > 0 ? Math.round((evidencedCount / totalCount) * 100) : 0

    doc.setTextColor(30, 30, 30)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan Kinerja Perusahaan', margin, y)
    y += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Periode ${quarterLabel} — ringkasan capaian Action Plan ${hasDivisionFilter ? 'divisi terpilih' : 'seluruh divisi'}.`,
      margin,
      y
    )
    y += 10

    // KPI summary box
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(margin, y, contentW, 40, 3, 3, 'F')

    const kpis = [
      { label: 'Capaian Action Plan', val: `${realizationPct}%`, sub: `${completedCount} dari ${totalCount} selesai` },
      { label: 'Kelengkapan Bukti', val: `${compliancePct}%`, sub: `${evidencedCount} memiliki bukti` },
      { label: 'Lewat Tenggat', val: String(overdueCount), sub: 'perlu tindakan segera' },
    ]

    const colW = contentW / 3
    kpis.forEach((kpi, i) => {
      const kx = margin + i * colW + 8
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(kpi.label, kx, y + 12)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(kpi.val, kx, y + 24)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(kpi.sub, kx, y + 32)
    })

    y += 48

    // Division table
    const divisionWhere: Record<string, unknown> = { deletedAt: null }
    if (user.role === 'ADMIN_OPERATIONAL') divisionWhere.companyId = user.companyId!
    else if (user.role === 'MANAGER') {
      if (user.divisionId) divisionWhere.id = user.divisionId
      else divisionWhere.id = '__NO_DIVISION__'
    }
    if (hasDivisionFilter) {
      divisionWhere.id = divisionParam
    }

    const divisions = await prisma.division.findMany({
      where: divisionWhere,
      include: {
        actionPlans: {
          where: { deletedAt: null, ...overlapsPeriod(start, end) },
          select: { status: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Kinerja per Divisi', margin, y)
    y += 6

    // Table header
    doc.setFillColor(15, 23, 42)
    doc.rect(margin, y, contentW, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    const cols = ['Divisi', 'Total AP', 'Selesai', '% Selesai', 'Lewat Tenggat']
    const colWidths = [70, 20, 20, 30, 20]
    let cx = margin + 2
    cols.forEach((col, i) => {
      doc.text(col, cx, y + 5)
      cx += colWidths[i]
    })
    y += 8

    divisions.forEach((div, idx) => {
      // Page break guard (Blocker #5)
      if (y > 270) {
        doc.addPage()
        renderHeader('Laporan Kinerja (Lanjutan)')
        y = 40
        doc.setFillColor(15, 23, 42)
        doc.rect(margin, y, contentW, 7, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        let rcx = margin + 2
        cols.forEach((col, i) => {
          doc.text(col, rcx, y + 5)
          rcx += colWidths[i]
        })
        y += 8
      }

      const total = div.actionPlans.length
      const done = div.actionPlans.filter((a) => a.status === 'COMPLETE').length
      const od = div.actionPlans.filter((a) => a.status === 'OVERDUE').length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0

      doc.setFillColor(idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 251 : 255)
      doc.rect(margin, y, contentW, 7, 'F')
      doc.setTextColor(30, 30, 30)
      cx = margin + 2
      const cells = [div.name, String(total), String(done), `${pct}%`, String(od)]
      cells.forEach((cell, i) => {
        doc.text(cell, cx, y + 5)
        cx += colWidths[i]
      })
      y += 7
    })

    y += 5
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`Data diambil pada ${formatDate(new Date())} dari sistem ProMaP.`, margin, y)
  }

  if (type === 'workload-pdf') {
    // ─── Workload & Resolution Time ────────────────────────────
    const aps = await prisma.actionPlan.findMany({
      where: { ...baseWhere, status: 'COMPLETE' },
      select: {
        title: true,
        startDate: true,
        endDate: true,
        updatedAt: true,
        pic: { select: { name: true } },
        division: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Beban Kerja Tim & Lama Pengerjaan', margin, y)
    y += 8
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Action Plan yang sudah selesai beserta lama pengerjaannya — ${quarterLabel}`, margin, y)
    y += 12

    doc.setFillColor(15, 23, 42)
    doc.rect(margin, y, contentW, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    const wCols = ['Judul Action Plan', 'PIC', 'Divisi', 'Deadline', 'Selesai', 'Hari']
    const wColW = [60, 30, 30, 20, 20, 14]
    let wx = margin + 2
    wCols.forEach((col, i) => {
      doc.text(col, wx, y + 5)
      wx += wColW[i]
    })
    y += 8

    aps.forEach((ap, idx) => {
      if (y > 270) {
        doc.addPage()
        renderHeader('Beban Kerja Tim (Lanjutan)')
        y = 40
        doc.setFillColor(15, 23, 42)
        doc.rect(margin, y, contentW, 7, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        let rwx = margin + 2
        wCols.forEach((col, i) => {
          doc.text(col, rwx, y + 5)
          rwx += wColW[i]
        })
        y += 8
      }

      const dur = Math.max(
        0,
        Math.round((ap.updatedAt.getTime() - ap.startDate.getTime()) / (1000 * 60 * 60 * 24))
      )
      doc.setFillColor(idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 251 : 255)
      doc.rect(margin, y, contentW, 7, 'F')
      doc.setTextColor(30, 30, 30)
      wx = margin + 2
      const wCells = [
        ap.title.length > 35 ? ap.title.slice(0, 35) + '…' : ap.title,
        ap.pic.name,
        ap.division?.name ?? '-',
        formatDate(ap.endDate),
        formatDate(ap.updatedAt),
        String(dur),
      ]
      wCells.forEach((cell, i) => {
        doc.text(cell, wx, y + 5)
        wx += wColW[i]
      })
      y += 7
    })
  }

  if (type === 'proposal-pdf') {
    // ─── Proposal Recap ────────────────────────────────────────
    const proposals = await prisma.proposal.findMany({
      where: { ...proposalScope(user), deletedAt: null, createdAt: { gte: start, lte: end } },
      select: {
        title: true,
        status: true,
        createdAt: true,
        reviewNote: true,
        proposer: { select: { name: true, division: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Rekap Proposal', margin, y)
    y += 8
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`${proposals.length} proposal diajukan pada ${quarterLabel}`, margin, y)
    y += 12

    doc.setFillColor(15, 23, 42)
    doc.rect(margin, y, contentW, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    const pCols = ['Judul Proposal', 'Pengusul', 'Divisi', 'Status', 'Tanggal']
    const pColW = [60, 30, 30, 30, 24]
    let px = margin + 2
    pCols.forEach((col, i) => {
      doc.text(col, px, y + 5)
      px += pColW[i]
    })
    y += 8

    proposals.forEach((p, idx) => {
      if (y > 270) {
        doc.addPage()
        renderHeader('Rekap Proposal (Lanjutan)')
        y = 40
        doc.setFillColor(15, 23, 42)
        doc.rect(margin, y, contentW, 7, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        let rpx = margin + 2
        pCols.forEach((col, i) => {
          doc.text(col, rpx, y + 5)
          rpx += pColW[i]
        })
        y += 8
      }

      doc.setFillColor(idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 251 : 255)
      doc.rect(margin, y, contentW, 7, 'F')
      doc.setTextColor(30, 30, 30)
      px = margin + 2
      const pCells = [
        p.title.length > 30 ? p.title.slice(0, 30) + '…' : p.title,
        p.proposer.name,
        p.proposer.division?.name ?? '-',
        p.status,
        formatDate(p.createdAt),
      ]
      pCells.forEach((cell, i) => {
        doc.text(cell, px, y + 5)
        px += pColW[i]
      })
      y += 7
    })
  }

  await logActivity({
    userId: user.id,
    action: 'UPDATED',
    newValue: `Unduh laporan PDF tipe ${type} periode ${quarterLabel}`,
  })

  const pdfBytes = doc.output('arraybuffer')
  const filename = `${type}-${quarterLabel.replace(' ', '-')}.pdf`

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
