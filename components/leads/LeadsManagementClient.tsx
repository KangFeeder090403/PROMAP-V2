'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  UserPlus,
  Clock,
  ShieldCheck,
  Snowflake,
  Search,
  Download,
  Activity,
  Phone,
  Mail,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Edit2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  ExternalLink,
  ChevronDown,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'

export interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  companyName: string
  status: 'NEW' | 'TRIAL_ACTIVE' | 'CONVERTED' | 'COLD'
  trialStartAt: string | null
  trialEndAt: string | null
  loginCount: number
  lastLoginAt: string | null
  notes: string | null
  createdAt: string
  updatedAt?: string
}

// Deterministic pastel avatar colors
const AVATAR_COLORS = [
  'bg-indigo-600 text-white',
  'bg-blue-600 text-white',
  'bg-slate-800 text-white',
  'bg-violet-600 text-white',
  'bg-cyan-700 text-white',
  'bg-emerald-700 text-white',
  'bg-amber-700 text-white',
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTrialRange(startStr: string | null, endStr: string | null): string {
  if (!startStr || !endStr) return '—'
  const s = new Date(startStr)
  const e = new Date(endStr)
  const pad = (n: number) => String(n).padStart(2, '0')

  const format = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  return `${format(s)} – ${format(e)}`
}

function getTrialBadge(lead: Lead): { label: string; className: string } | null {
  if (lead.status === 'NEW') return null

  if (lead.status === 'CONVERTED') {
    return {
      label: 'Selesai',
      className:
        'bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200 border border-slate-900 dark:border-slate-700',
    }
  }

  if (lead.status === 'COLD') {
    return {
      label: 'Kedaluwarsa',
      className:
        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
    }
  }

  // TRIAL_ACTIVE
  if (lead.trialEndAt) {
    const now = new Date().getTime()
    const end = new Date(lead.trialEndAt).getTime()
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return {
        label: 'Kedaluwarsa',
        className:
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
      }
    }
    return {
      label: `Sisa ${diffDays} hari`,
      className:
        'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60',
    }
  }

  return null
}

function formatRelativeLogin(dateStr: string | null, loginCount: number): string {
  if (!dateStr || loginCount === 0) return 'Belum login'

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const pad = (n: number) => String(n).padStart(2, '0')
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`

  if (diffHours < 1) return 'Baru saja'
  if (diffHours < 24) {
    if (diffHours <= 4) return `${diffHours} jam yang lalu`
    return `Hari ini ${timeStr}`
  }
  if (diffDays === 1) return `Kemarin ${timeStr}`
  if (diffDays < 30) return `${diffDays} hari lalu`

  return `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
}

export function LeadsManagementClient() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & pagination
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5 // Persis seperti di screenshot: Menampilkan 1-5 dari total entitas

  // Modals
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Edit draft fields
  const [editStatus, setEditStatus] = useState<'NEW' | 'TRIAL_ACTIVE' | 'CONVERTED' | 'COLD'>('NEW')
  const [editNotes, setEditNotes] = useState('')
  const [editTrialStart, setEditTrialStart] = useState('')
  const [editTrialEnd, setEditTrialEnd] = useState('')

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/leads')
      if (!res.ok) throw new Error('Gagal memuat daftar leads')
      const data: Lead[] = await res.json()
      setLeads(data)
    } catch {
      setError('Terjadi kendala saat menghubungkan ke server leads.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLeads()
  }, [fetchLeads])

  // Hitungan Metrik
  const metrics = useMemo(() => {
    const total = leads.length
    const newCount = leads.filter((l) => l.status === 'NEW').length
    const trialCount = leads.filter((l) => l.status === 'TRIAL_ACTIVE').length
    const convertedCount = leads.filter((l) => l.status === 'CONVERTED').length
    const coldCount = leads.filter((l) => l.status === 'COLD').length

    return { total, newCount, trialCount, convertedCount, coldCount }
  }, [leads])

  // Filter list
  const filteredLeads = useMemo(() => {
    let list = leads
    if (statusFilter) {
      list = list.filter((l) => l.status === statusFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.companyName.toLowerCase().includes(q) ||
          (l.phone && l.phone.toLowerCase().includes(q))
      )
    }
    return list
  }, [leads, statusFilter, search])

  // Reset page on search or filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize))
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLeads.slice(start, start + pageSize)
  }, [filteredLeads, currentPage, pageSize])

  const startIndex = filteredLeads.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filteredLeads.length)

  // Buka Modal Edit
  function handleOpenEdit(lead: Lead) {
    setSelectedLead(lead)
    setEditStatus(lead.status)
    setEditNotes(lead.notes ?? '')
    setEditTrialStart(lead.trialStartAt ? lead.trialStartAt.slice(0, 10) : '')
    setEditTrialEnd(lead.trialEndAt ? lead.trialEndAt.slice(0, 10) : '')
    setIsEditModalOpen(true)
  }

  // Simpan perubahan Lead
  async function handleSaveLead() {
    if (!selectedLead) return
    try {
      setUpdating(true)
      const payload: Record<string, any> = {
        status: editStatus,
        notes: editNotes.trim() || null,
        trialStartAt: editTrialStart ? new Date(editTrialStart).toISOString() : null,
        trialEndAt: editTrialEnd ? new Date(editTrialEnd).toISOString() : null,
      }

      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Gagal memperbarui data')
      const updated: Lead = await res.json()

      setLeads((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setIsEditModalOpen(false)
      setSelectedLead(null)
    } catch {
      alert('Terjadi kesalahan saat memperbarui data lead.')
    } finally {
      setUpdating(false)
    }
  }

  // Export Menu State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false)
      }
    }
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExportMenuOpen])

  // Helper XML Escaping
  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  // 1. Ekspor ke Excel Spreadsheet XML (.xls) — Format paling rapi di Microsoft Excel
  function handleExportExcel() {
    if (filteredLeads.length === 0) {
      alert('Tidak ada data yang dapat diekspor.')
      return
    }

    const pad = (n: number) => String(n).padStart(2, '0')
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '—'
      const d = new Date(dateStr)
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
    }
    const formatDateTime = (dateStr: string | null) => {
      if (!dateStr) return 'Belum login'
      const d = new Date(dateStr)
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    const rowsXml = filteredLeads
      .map((l, idx) => {
        const isEven = idx % 2 === 0
        const styleId = isEven ? 'CellEven' : 'CellOdd'
        const styleCenter = isEven ? 'CellCenterEven' : 'CellCenterOdd'
        const styleNumber = isEven ? 'CellNumberEven' : 'CellNumberOdd'

        return `
    <Row ss:Height="22">
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(l.name)}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(l.email)}</Data></Cell>
      <Cell ss:StyleID="${styleCenter}"><Data ss:Type="String">${escapeXml(l.phone ?? '—')}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(l.companyName)}</Data></Cell>
      <Cell ss:StyleID="${styleCenter}"><Data ss:Type="String">${escapeXml(l.status)}</Data></Cell>
      <Cell ss:StyleID="${styleCenter}"><Data ss:Type="String">${formatDate(l.trialStartAt)}</Data></Cell>
      <Cell ss:StyleID="${styleCenter}"><Data ss:Type="String">${formatDate(l.trialEndAt)}</Data></Cell>
      <Cell ss:StyleID="${styleNumber}"><Data ss:Type="Number">${l.loginCount}</Data></Cell>
      <Cell ss:StyleID="${styleCenter}"><Data ss:Type="String">${formatDateTime(l.lastLoginAt)}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(l.notes ?? '—')}</Data></Cell>
    </Row>`
      })
      .join('')

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1E3A8A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1E3A8A"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1E3A8A"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E40AF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellEven">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellOdd">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenterEven">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellCenterOdd">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellNumberEven">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellNumberOdd">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Leads ProMaP">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="170"/>
   <Column ss:Width="210"/>
   <Column ss:Width="140"/>
   <Column ss:Width="220"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="85"/>
   <Column ss:Width="130"/>
   <Column ss:Width="280"/>
   <Row ss:Height="26">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Nama Calon Klien</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Email</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Telepon / WhatsApp</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Perusahaan</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Status Lead</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Periode Trial Mulai</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Periode Trial Selesai</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Jumlah Login</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Login Terakhir</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Catatan Follow Up</Data></Cell>
   </Row>${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `leads-promap-${new Date().toISOString().slice(0, 10)}.xls`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setIsExportMenuOpen(false)
  }

  // 2. Ekspor ke CSV dengan instruksi pemisah sep=; (Membuka langsung di kolom terpisah pada Excel Indonesia & Global)
  function handleExportCsv() {
    if (filteredLeads.length === 0) {
      alert('Tidak ada data yang dapat diekspor.')
      return
    }

    const headers = [
      'Nama Calon Klien',
      'Email',
      'Telepon / WhatsApp',
      'Perusahaan',
      'Status Lead',
      'Periode Trial Mulai',
      'Periode Trial Selesai',
      'Jumlah Login',
      'Login Terakhir',
      'Catatan Follow Up',
    ]

    const rows = filteredLeads.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.email.replace(/"/g, '""')}"`,
      `"${(l.phone ?? '').replace(/"/g, '""')}"`,
      `"${l.companyName.replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.trialStartAt ? new Date(l.trialStartAt).toLocaleDateString('id-ID') : '-'}"`,
      `"${l.trialEndAt ? new Date(l.trialEndAt).toLocaleDateString('id-ID') : '-'}"`,
      `"${l.loginCount}"`,
      `"${l.lastLoginAt ? new Date(l.lastLoginAt).toLocaleString('id-ID') : 'Belum login'}"`,
      `"${(l.notes ?? '').replace(/"/g, '""')}"`,
    ])

    // "sep=;" di baris paling atas memberitahu Excel di semua versi OS untuk otomatis membagi kolom pakai titik koma
    const csvContent = '\uFEFFsep=;\r\n' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `leads-promap-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setIsExportMenuOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb & Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 mb-1">
            <span>Settings</span>
            <span>›</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Leads</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Manajemen Leads &amp; Uji Coba
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pantau konversi calon klien B2B, status uji coba 30 hari, dan aktivitas login calon tenant.
          </p>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Dropdown Menu Ekspor Data */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download size={14} className="text-slate-500 dark:text-slate-400" />
              Ekspor Data
              <ChevronDown size={12} className="text-slate-400 ml-0.5" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pilih Format Unduhan
                  </span>
                </div>

                {/* Option 1: Excel XML */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full px-3 py-2.5 text-left flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                >
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">
                      Format Excel (.xls)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Paling Rapi: Kolom terpisah rapi, header warna navy &amp; padding pas.
                    </p>
                  </div>
                </button>

                {/* Option 2: CSV Semicolon */}
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full px-3 py-2.5 text-left flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group border-t border-slate-100 dark:border-slate-800"
                >
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                      Format CSV (.csv)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Pemisah titik koma (sep=;), kompatibel Microsoft Excel &amp; CRM.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsActivityModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Activity size={14} />
            Periksa Aktivitas Lead
          </button>
        </div>
      </div>

      {/* ── 4 Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lead Baru */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              LEAD BARU
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UserPlus size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              {metrics.newCount}
            </span>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Lead</span>
          </div>
          <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <span>↑</span> Formulir demo masuk minggu ini
          </p>
        </div>

        {/* Card 2: Trial Aktif */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TRIAL AKTIF
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              {metrics.trialCount}
            </span>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Perusahaan</span>
          </div>
          <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            Sedang evaluasi 30 hari
          </p>
        </div>

        {/* Card 3: Terkonversi */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TERKONVERSI
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ShieldCheck size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              {metrics.convertedCount}
            </span>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Klien</span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-slate-500" />
            Resmi menjadi tenant berbayar
          </p>
        </div>

        {/* Card 4: Dingin */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              DINGIN
            </span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <Snowflake size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              {metrics.coldCount}
            </span>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Tidak Aktif</span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Clock size={13} className="text-slate-500" />
            Masa uji coba kedaluwarsa
          </p>
        </div>
      </div>

      {/* ── Search & Filter Tabs Bar ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Input Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau perusahaan..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { key: '', label: `Semua (${metrics.total})` },
            { key: 'NEW', label: `NEW (${metrics.newCount})` },
            { key: 'TRIAL_ACTIVE', label: `TRIAL_ACTIVE (${metrics.trialCount})` },
            { key: 'CONVERTED', label: `CONVERTED (${metrics.convertedCount})` },
            { key: 'COLD', label: `COLD (${metrics.coldCount})` },
          ].map((tab) => {
            const isActive = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Main Data Table ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">CALON KLIEN</th>
                <th className="py-3.5 px-4">EMAIL</th>
                <th className="py-3.5 px-4">TELEPON / WHATSAPP</th>
                <th className="py-3.5 px-4">PERUSAHAAN</th>
                <th className="py-3.5 px-4">STATUS LEAD</th>
                <th className="py-3.5 px-4">PERIODE TRIAL</th>
                <th className="py-3.5 px-4">LOGIN</th>
                <th className="py-3.5 px-4">LOGIN TERAKHIR</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && leads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-blue-600" />
                    Memuat data prospek B2B...
                  </td>
                </tr>
              )}

              {!loading && paginatedLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    Tidak ada calon klien yang cocok dengan kriteria pencarian/filter.
                  </td>
                </tr>
              )}

              {paginatedLeads.map((lead) => {
                const initials = getInitials(lead.name)
                const avatarBg = getAvatarColor(lead.name)
                const trialRange = formatTrialRange(lead.trialStartAt, lead.trialEndAt)
                const trialBadge = getTrialBadge(lead)
                const relativeLogin = formatRelativeLogin(lead.lastLoginAt, lead.loginCount)

                return (
                  <tr
                    key={lead.id}
                    onClick={() => handleOpenEdit(lead)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    title="Klik untuk melihat detail & update status"
                  >
                    {/* Calon Klien */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarBg}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm group-hover:text-blue-600 transition-colors">
                            {lead.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {lead.email}
                    </td>

                    {/* Telepon / WhatsApp */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {lead.phone ?? '—'}
                    </td>

                    {/* Perusahaan */}
                    <td className="py-4 px-4 font-bold text-xs text-slate-900 dark:text-slate-100">
                      {lead.companyName}
                    </td>

                    {/* Status Lead */}
                    <td className="py-4 px-4">
                      {lead.status === 'TRIAL_ACTIVE' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                          TRIAL_ACTIVE
                        </span>
                      )}
                      {lead.status === 'NEW' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                          NEW
                        </span>
                      )}
                      {lead.status === 'CONVERTED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-slate-900 dark:border-slate-100">
                          <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-900" />
                          CONVERTED
                        </span>
                      )}
                      {lead.status === 'COLD' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          COLD
                        </span>
                      )}
                    </td>

                    {/* Periode Trial */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-slate-600 dark:text-slate-400">
                          {trialRange}
                        </p>
                        {trialBadge && (
                          <div>
                            <span
                              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${trialBadge.className}`}
                            >
                              {trialBadge.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Login Count */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {lead.loginCount}
                      </span>{' '}
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">kali</span>
                    </td>

                    {/* Login Terakhir */}
                    <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {relativeLogin}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{startIndex}</span>
            {filteredLeads.length > 0 && (
              <>
                -
                <span className="font-semibold text-slate-700 dark:text-slate-200">{endIndex}</span>
              </>
            )}{' '}
            dari{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredLeads.length}</span>{' '}
            entitas calon klien
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {page}
                </button>
              ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Halaman selanjutnya"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal Detail & Edit Lead ── */}
      {isEditModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(
                    selectedLead.name
                  )}`}
                >
                  {getInitials(selectedLead.name)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {selectedLead.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedLead.companyName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-5 space-y-4 text-xs">
              {/* Info Kontak Cepat */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Email</span>
                  <p className="font-mono text-slate-700 dark:text-slate-300 font-medium truncate">
                    {selectedLead.email}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Telepon</span>
                  <p className="font-mono text-slate-700 dark:text-slate-300 font-medium truncate">
                    {selectedLead.phone ?? '—'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Aktivitas</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {selectedLead.loginCount} kali login
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-medium text-slate-400 uppercase">Login Terakhir</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {formatRelativeLogin(selectedLead.lastLoginAt, selectedLead.loginCount)}
                  </p>
                </div>
              </div>

              {/* Ubah Status */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Status Pipeline Lead
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NEW">NEW (Calon Klien Baru)</option>
                  <option value="TRIAL_ACTIVE">TRIAL_ACTIVE (Sedang Evaluasi 30 Hari)</option>
                  <option value="CONVERTED">CONVERTED (Resmi Menjadi Klien Berbayar)</option>
                  <option value="COLD">COLD (Trial Kedaluwarsa / Tidak Aktif)</option>
                </select>
              </div>

              {/* Periode Trial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Mulai Trial
                  </label>
                  <input
                    type="date"
                    value={editTrialStart}
                    onChange={(e) => setEditTrialStart(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Selesai Trial
                  </label>
                  <input
                    type="date"
                    value={editTrialEnd}
                    onChange={(e) => setEditTrialEnd(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Catatan Follow Up */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Catatan Follow Up &amp; Kebutuhan Tenant
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Contoh: Membutuhkan kuota 50 user, tertarik modul action plan & approval evidence..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-2.5 p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={handleSaveLead}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Periksa Aktivitas Lead ── */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Log Aktivitas Calon Klien &amp; Uji Coba
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Riwayat interaksi, pendaftaran demo, dan sesi login calon tenant
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
              {leads
                .filter((l) => l.loginCount > 0 || l.status === 'NEW')
                .slice(0, 10)
                .map((item, idx) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${getAvatarColor(
                        item.name
                      )}`}
                    >
                      {getInitials(item.name)}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.name}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatRelativeLogin(item.lastLoginAt, item.loginCount)}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                        <span className="font-semibold">{item.companyName}</span> —{' '}
                        {item.status === 'CONVERTED' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Terkonversi menjadi tenant berbayar
                          </span>
                        ) : item.status === 'TRIAL_ACTIVE' ? (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Aktif mengevaluasi trial 30 hari ({item.loginCount} kali login)
                          </span>
                        ) : item.status === 'NEW' ? (
                          <span className="text-sky-600 dark:text-sky-400 font-medium">
                            Mendaftar formulir guest demo baru
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">
                            Masa trial kedaluwarsa tanpa konversi
                          </span>
                        )}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-md border border-slate-100 dark:border-slate-800">
                          &quot;{item.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
