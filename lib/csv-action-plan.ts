/**
 * Utility untuk parsing, validasi, dan pembuatan template CSV Action Plan
 * Mengikuti aturan bisnis:
 * 1 minggu kerja = 6 hari (Senin s/d Sabtu)
 * 1 hari kerja = 4 action plan
 * Maksimal 24 action plan per batch import
 */

import { isHttpUrl } from '@/lib/utils'

export interface ActionPlanCsvRow {
  index: number
  title: string
  outcomeKpi: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  picEmail?: string
  evidenceLink?: string // URL Google Drive / bukti kerja (opsional)
  isValid: boolean
  error?: string
}

export interface ParseCsvResult {
  rows: ActionPlanCsvRow[]
  totalValid: number
  totalErrors: number
  exceedsLimit: boolean // true jika > 24 baris
  generalError?: string
}

/**
 * Parsing teks baris CSV dengan penanganan tanda kutip ganda (RFC-4180)
 */
function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Lewati escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Normalisasi format tanggal ke string YYYY-MM-DD
 */
function normalizeDate(val: string | undefined, defaultDate: Date): { dateStr: string; error?: string } {
  if (!val || !val.trim()) {
    const y = defaultDate.getFullYear()
    const m = String(defaultDate.getMonth() + 1).padStart(2, '0')
    const d = String(defaultDate.getDate()).padStart(2, '0')
    return { dateStr: `${y}-${m}-${d}` }
  }

  const clean = val.trim()

  // Format YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10)
    const month = Number.parseInt(isoMatch[2], 10) - 1
    const day = Number.parseInt(isoMatch[3], 10)
    const testDate = new Date(year, month, day)
    if (!Number.isNaN(testDate.getTime()) && testDate.getFullYear() === year && testDate.getMonth() === month && testDate.getDate() === day) {
      return {
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      }
    }
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const day = Number.parseInt(dmyMatch[1], 10)
    const month = Number.parseInt(dmyMatch[2], 10) - 1
    const year = Number.parseInt(dmyMatch[3], 10)
    const testDate = new Date(year, month, day)
    if (!Number.isNaN(testDate.getTime()) && testDate.getFullYear() === year && testDate.getMonth() === month && testDate.getDate() === day) {
      return {
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      }
    }
  }

  return { dateStr: '', error: `Format tanggal "${val}" tidak valid (gunakan YYYY-MM-DD atau DD/MM/YYYY)` }
}

/**
 * Normalisasi nilai prioritas
 */
function normalizePriority(val: string | undefined): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!val) return 'MEDIUM'
  const clean = val.trim().toUpperCase()
  if (clean === 'HIGH' || clean === 'TINGGI' || clean === 'H') return 'HIGH'
  if (clean === 'LOW' || clean === 'RENDAH' || clean === 'L') return 'LOW'
  return 'MEDIUM'
}

type CsvColumnMapping = {
  title: number
  outcomeKpi: number
  priority: number
  startDate: number
  endDate: number
  picEmail: number
  evidenceLink: number
}

function resolveCsvHeaderAndDelimiter(lines: string[]): {
  delimiter: string
  colIndex: CsvColumnMapping
  startLineIdx: number
  generalError?: string
} {
  let lineIdx = 0

  // Lewati baris direktif "sep=..." jika ada
  if (lines[lineIdx]?.toLowerCase().startsWith('sep=')) {
    lineIdx++
  }

  if (lineIdx >= lines.length) {
    return {
      delimiter: ',',
      colIndex: { title: -1, outcomeKpi: -1, priority: -1, startDate: -1, endDate: -1, picEmail: -1, evidenceLink: -1 },
      startLineIdx: lineIdx,
      generalError: 'Tidak ada baris data dalam file',
    }
  }

  const headerLine = lines[lineIdx]
  const delimiter = headerLine.includes(';') && !headerLine.includes(',') ? ';' : ','
  const rawHeaders = parseCsvLine(headerLine, delimiter).map((h) =>
    h.toLowerCase().replace(/[\s_-]/g, '')
  )
  lineIdx++

  const colIndex: CsvColumnMapping = {
    title: rawHeaders.findIndex((h) => ['title', 'judul', 'judulactionplan', 'actionplan', 'nama'].includes(h)),
    outcomeKpi: rawHeaders.findIndex((h) => ['outcomekpi', 'targetkpi', 'kpi', 'target', 'hasil'].includes(h)),
    priority: rawHeaders.findIndex((h) => ['priority', 'prioritas', 'tingkatprioritas'].includes(h)),
    startDate: rawHeaders.findIndex((h) => ['startdate', 'tanggalmulai', 'tglmulai', 'mulai'].includes(h)),
    endDate: rawHeaders.findIndex((h) => ['enddate', 'deadline', 'tenggatwaktu', 'tgldeadline', 'selesai'].includes(h)),
    picEmail: rawHeaders.findIndex((h) => ['picemail', 'emailpic', 'email'].includes(h)),
    evidenceLink: rawHeaders.findIndex((h) => ['evidencelink', 'evidence', 'buktidrive', 'linkbukti', 'buktikerja', 'googledrive', 'linkgoogledrive'].includes(h)),
  }

  if (colIndex.title === -1) {
    return {
      delimiter,
      colIndex,
      startLineIdx: lineIdx,
      generalError: 'Kolom "title" (atau "Judul") tidak ditemukan di baris header CSV.',
    }
  }

  return { delimiter, colIndex, startLineIdx: lineIdx }
}

function parseSingleCsvRow(
  cells: string[],
  colIndex: CsvColumnMapping,
  today: Date,
  rowIndex: number
): ActionPlanCsvRow {
  const titleVal = cells[colIndex.title]?.trim() || ''

  // Default fallback dates
  const rowDate = new Date(today)
  rowDate.setDate(today.getDate() + Math.floor(rowIndex / 4)) // geser hari tiap 4 task

  const startNorm = normalizeDate(colIndex.startDate !== -1 ? cells[colIndex.startDate] : undefined, rowDate)
  const endNorm = normalizeDate(colIndex.endDate !== -1 ? cells[colIndex.endDate] : undefined, rowDate)

  const priorityVal = normalizePriority(colIndex.priority !== -1 ? cells[colIndex.priority] : undefined)
  const outcomeVal = (colIndex.outcomeKpi !== -1 ? cells[colIndex.outcomeKpi]?.trim() : '') || titleVal
  const emailVal = colIndex.picEmail !== -1 ? cells[colIndex.picEmail]?.trim() : undefined
  const evidenceLinkVal = colIndex.evidenceLink !== -1 ? cells[colIndex.evidenceLink]?.trim() : undefined

  let errorMsg: string | undefined

  if (!titleVal) {
    errorMsg = 'Judul action plan wajib diisi'
  } else if (startNorm.error) {
    errorMsg = startNorm.error
  } else if (endNorm.error) {
    errorMsg = endNorm.error
  } else if (new Date(endNorm.dateStr) < new Date(startNorm.dateStr)) {
    errorMsg = 'Tenggat waktu (endDate) tidak boleh lebih awal dari tanggal mulai (startDate)'
  } else if (evidenceLinkVal && !isHttpUrl(evidenceLinkVal)) {
    errorMsg = 'Link bukti harus diawali http:// atau https://'
  }

  return {
    index: rowIndex + 1,
    title: titleVal,
    outcomeKpi: outcomeVal,
    priority: priorityVal,
    startDate: startNorm.dateStr,
    endDate: endNorm.dateStr,
    picEmail: emailVal || undefined,
    evidenceLink: evidenceLinkVal || undefined,
    isValid: !errorMsg,
    error: errorMsg,
  }
}

/**
 * Parsing file CSV Action Plan
 */
export function parseActionPlanCsv(csvContent: string): ParseCsvResult {
  // Hapus UTF-8 BOM jika ada
  const content = csvContent.replace(/^\uFEFF/, '').trim()

  if (!content) {
    return { rows: [], totalValid: 0, totalErrors: 0, exceedsLimit: false, generalError: 'File CSV kosong' }
  }

  const lines = content.split(/\r?\n/)
  if (lines.length === 0) {
    return { rows: [], totalValid: 0, totalErrors: 0, exceedsLimit: false, generalError: 'File CSV kosong' }
  }

  const headerInfo = resolveCsvHeaderAndDelimiter(lines)
  if (headerInfo.generalError) {
    return {
      rows: [],
      totalValid: 0,
      totalErrors: 0,
      exceedsLimit: false,
      generalError: headerInfo.generalError,
    }
  }

  const { delimiter, colIndex, startLineIdx } = headerInfo
  const rows: ActionPlanCsvRow[] = []
  const today = new Date()

  for (let i = startLineIdx; i < lines.length; i++) {
    const raw = lines[i]?.trim()
    if (!raw) continue // lewati baris kosong

    const cells = parseCsvLine(raw, delimiter)
    rows.push(parseSingleCsvRow(cells, colIndex, today, rows.length))
  }

  const totalValid = rows.filter((r) => r.isValid).length
  const totalErrors = rows.filter((r) => !r.isValid).length
  const exceedsLimit = rows.length > 24

  return {
    rows,
    totalValid,
    totalErrors,
    exceedsLimit,
  }
}

/**
 * Generate Template CSV mingguan (6 hari kerja × 4 action plan = 24 baris data)
 * Sesuai format kolom database
 */
export function generateActionPlanTemplateCsv(): string {
  // Hitung tanggal mulai dari hari Senin berikutnya (atau hari ini)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Minggu, 1 = Senin, ...
  const daysUntilMonday = dayOfWeek === 1 ? 0 : dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + daysUntilMonday)

  const headers = ['title', 'outcomeKpi', 'priority', 'startDate', 'endDate', 'picEmail', 'evidenceLink']

  const sampleData: {
    dayLabel: string
    dayOffset: number
    tasks: { title: string; outcomeKpi: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }[]
  }[] = [
    {
      dayLabel: 'Hari 1 (Senin)',
      dayOffset: 0,
      tasks: [
        {
          title: 'Weekly Standup & sinkronisasi prioritas sprint tim',
          outcomeKpi: 'Semua 4 anggota tim memahami prioritas & blocker terselesaikan',
          priority: 'HIGH',
        },
        {
          title: 'Review proposal arsitektur microservices payment gateway',
          outcomeKpi: 'Dokumen arsitektur v1.2 disetujui tanpa celah keamanan',
          priority: 'HIGH',
        },
        {
          title: 'Implementasi caching Redis pada query leaderboard divisi',
          outcomeKpi: 'Response time berkurang dari 850ms ke < 150ms',
          priority: 'MEDIUM',
        },
        {
          title: 'Penyusunan dokumentasi API endpoint v2 untuk tim mobile',
          outcomeKpi: 'Dokumentasi Swagger terbarui 100% dan terpublikasi',
          priority: 'LOW',
        },
      ],
    },
    {
      dayLabel: 'Hari 2 (Selasa)',
      dayOffset: 1,
      tasks: [
        {
          title: 'Investigasi & perbaikan bug token expiry di middleware',
          outcomeKpi: 'Zero false-positive logout pada user aktif sesi panjang',
          priority: 'HIGH',
        },
        {
          title: 'Testing integrasi modul export XLSX laporan kepatuhan bukti',
          outcomeKpi: 'Export 5.000 row selesai < 2 detik dengan memory stabil',
          priority: 'MEDIUM',
        },
        {
          title: 'Refactoring komponen tabel ledger dengan virtual scrolling',
          outcomeKpi: 'FPS saat scrolling stabil di 60 FPS pada 100+ item',
          priority: 'MEDIUM',
        },
        {
          title: 'Koleksi feedback usability dari perwakilan Manager divisi',
          outcomeKpi: 'Minimal 3 masukan konkrit tercatat di backlog riset',
          priority: 'LOW',
        },
      ],
    },
    {
      dayLabel: 'Hari 3 (Rabu)',
      dayOffset: 2,
      tasks: [
        {
          title: 'Audit keamanan query database dari ancaman SQL/Formula Injection',
          outcomeKpi: '100% input tersanitasi sesuai pedoman OWASP CWE-1236',
          priority: 'HIGH',
        },
        {
          title: 'Penyusunan test suite otomatis (unit test) untuk auth helper',
          outcomeKpi: 'Code coverage unit test auth meningkat hingga > 85%',
          priority: 'HIGH',
        },
        {
          title: 'Koordinasi lintas divisi untuk peluncuran fitur baru Q3',
          outcomeKpi: 'Jadwal deployment disepakati oleh tim IT & Operasional',
          priority: 'MEDIUM',
        },
        {
          title: 'Pembersihan log error legacy di cloud monitoring Sentry',
          outcomeKpi: 'Log terkelompokkan rapi dan alert false alarm dimatikan',
          priority: 'LOW',
        },
      ],
    },
    {
      dayLabel: 'Hari 4 (Kamis)',
      dayOffset: 3,
      tasks: [
        {
          title: 'Penerapan rate limiting pada endpoint autentikasi & reset password',
          outcomeKpi: 'Brute force protection aktif maksimal 5 attempt/menit',
          priority: 'HIGH',
        },
        {
          title: 'Evaluasi metrik kepatuhan pengunggahan bukti kerja mingguan',
          outcomeKpi: 'Kepatuhan bukti divisi mencapai target target >= 90%',
          priority: 'MEDIUM',
        },
        {
          title: 'Simulasi load test server saat lonjakan jam kerja operasional',
          outcomeKpi: 'Sistem sanggup menampung 500 concurrent request tanpa 500 error',
          priority: 'MEDIUM',
        },
        {
          title: 'Rapat 1-on-1 evaluasi kinerja staf & pengembangan skill',
          outcomeKpi: 'Action plan perbaikan individu disepakati untuk bulan depan',
          priority: 'LOW',
        },
      ],
    },
    {
      dayLabel: 'Hari 5 (Jumat)',
      dayOffset: 4,
      tasks: [
        {
          title: 'Uji coba staging & persiapan checklist release versi v2.2',
          outcomeKpi: 'Seluruh 12 poin checklist staging berstatus PASS',
          priority: 'HIGH',
        },
        {
          title: 'Penyusunan ringkasan eksekutif capaian KPI mingguan divisi',
          outcomeKpi: 'Laporan executive PDF siap dibagikan ke Direksi',
          priority: 'MEDIUM',
        },
        {
          title: 'Backup database berkala & verifikasi restore snapshot',
          outcomeKpi: 'Integritas backup 100% valid dan siap jika terjadi disaster',
          priority: 'MEDIUM',
        },
        {
          title: 'Retrospektif mingguan tim: hal baik & hal yang perlu ditingkatkan',
          outcomeKpi: 'Tiga rencana perbaikan proses kerja disepakati tim',
          priority: 'LOW',
        },
      ],
    },
    {
      dayLabel: 'Hari 6 (Sabtu)',
      dayOffset: 5,
      tasks: [
        {
          title: 'Finalisasi rekapitulasi jam kerja & approval bukti kerja staf',
          outcomeKpi: '100% Action plan berstatus complete telah ditinjau',
          priority: 'HIGH',
        },
        {
          title: 'Review backlog persiapan inisiatif kerja untuk pekan depan',
          outcomeKpi: '24 Action plan pekan depan telah terpetakan di draft',
          priority: 'MEDIUM',
        },
        {
          title: 'Monitoring kestabilan sistem pasca deployment akhir pekan',
          outcomeKpi: 'Uptime 99.9% tanpa anomali crash di dashboard',
          priority: 'MEDIUM',
        },
        {
          title: 'Arsip dokumentasi mingguan & pembersihan workspace kerja',
          outcomeKpi: 'File kerja tertata rapi di folder repositori internal',
          priority: 'LOW',
        },
      ],
    },
  ]

  const rows: string[][] = [headers]

  sampleData.forEach((day) => {
    const targetDate = new Date(monday)
    targetDate.setDate(monday.getDate() + day.dayOffset)
    const y = targetDate.getFullYear()
    const m = String(targetDate.getMonth() + 1).padStart(2, '0')
    const d = String(targetDate.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    day.tasks.forEach((t) => {
      rows.push([
        `"${t.title.replaceAll('"', '""')}"`,
        `"${t.outcomeKpi.replaceAll('"', '""')}"`,
        t.priority,
        dateStr,
        dateStr,
        '', // picEmail (opsional, kosong menggunakan user default)
        '', // evidenceLink (isi dengan URL Google Drive bukti kerja, kosong = belum ada)
      ])
    })
  })

  // Format CSV dengan pemisah koma, diawali direktif sep=, dan UTF-8 BOM
  const csvBody = rows.map((r) => r.join(',')).join('\r\n')
  return '\uFEFFsep=,\r\n' + csvBody
}
