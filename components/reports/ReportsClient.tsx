'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  BarChart3,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Table2,
  BarChart2,
  Calendar,
  Loader2,
  Lock,
  FileText,
  FileSpreadsheet,
  Users,
  Lightbulb,
} from 'lucide-react'

// ─── Tipe data dari /api/reports ──────────────────────────────────────────────

interface KpiCard {
  goalRealization: {
    value: number
    completed: number
    total: number
    unit: string
    trend: number | null
    prevQuarter: string
    status: string
  }
  resolutionSLA: { value: number; unit: string }
  evidenceCompliance: {
    value: number
    audited: number
    total: number
    pendingSignOff: number
    unit: string
    label: string
  }
  overdueRisk: { value: number; activeOverdue: number; unit: string; label: string }
}

type GovernanceIndex = 'Luar Biasa' | 'Prima' | 'Stabil' | 'Waspada' | 'Kritis'

interface DivisionRow {
  id: string
  name: string
  head: string | null
  totalAPs: number
  completedAPs: number
  overdueAPs: number
  completionPct: number
  governanceIndex: GovernanceIndex
}

interface Bottleneck {
  label: string
  count: number
  share: number
  description: string
  status: string
}

interface ReportsData {
  meta: {
    quarter: string
    quarterLabel: string
    divisionFilter: string
    generatedAt: string
    companyName: string | null
  }
  kpi: KpiCard
  divisionDistribution: DivisionRow[]
  bottlenecks: Bottleneck[]
  options: {
    availableQuarters: { value: string; label: string }[]
    divisionList: { id: string; name: string }[]
  }
}

// ─── Label tampilan ───────────────────────────────────────────────────────────

const GOVERNANCE_LABEL: Record<GovernanceIndex, string> = {
  'Luar Biasa': 'Sangat Baik',
  Prima: 'Baik',
  Stabil: 'Cukup',
  Waspada: 'Perlu Perhatian',
  Kritis: 'Kritis',
}

const GOVERNANCE_STYLE: Record<GovernanceIndex, string> = {
  'Luar Biasa':
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Prima:
    'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
  Stabil:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  Waspada:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Kritis: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
}

const GOVERNANCE_DOT: Record<GovernanceIndex, string> = {
  'Luar Biasa': 'bg-emerald-600 dark:bg-emerald-400',
  Prima: 'bg-green-600 dark:bg-green-400',
  Stabil: 'bg-blue-600 dark:bg-blue-400',
  Waspada: 'bg-amber-600 dark:bg-amber-400',
  Kritis: 'bg-red-600 dark:bg-red-400',
}

// ─── Komponen kecil ───────────────────────────────────────────────────────────

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

function GovernanceBadge({ level }: { level: GovernanceIndex }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${GOVERNANCE_STYLE[level]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${GOVERNANCE_DOT[level]}`} />
      {GOVERNANCE_LABEL[level]}
    </span>
  )
}

function Bar({ pct, tone = 'auto' }: { pct: number; tone?: 'auto' | 'warning' }) {
  const color =
    tone === 'warning'
      ? 'bg-amber-500'
      : pct >= 85
        ? 'bg-emerald-500'
        : pct >= 60
          ? 'bg-blue-500'
          : pct >= 40
            ? 'bg-amber-500'
            : 'bg-red-500'

  return (
    <div className="h-1.5 w-full min-w-0 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  context,
  footer,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  unit?: string
  context: string
  footer?: React.ReactNode
  accent: string
}) {
  const numRef = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    const rawNum = parseFloat(value)
    if (!isNaN(rawNum) && numRef.current) {
      const obj = { val: 0 }
      gsap.to(obj, {
        val: rawNum,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          if (numRef.current) {
            numRef.current.textContent = Number.isInteger(rawNum)
              ? Math.round(obj.val).toString()
              : obj.val.toFixed(1)
          }
        },
      })
    }
  }, [value])

  return (
    <Card className="p-5 flex flex-col gap-3 min-w-0 transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 min-w-0">
          {label}
        </p>
        <span className={`shrink-0 inline-flex p-1.5 rounded-md ${accent}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>

      <div className="flex items-baseline gap-1 min-w-0">
        <span ref={numRef} className="text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">{context}</p>
      {footer}
    </Card>
  )
}

function DownloadCard({
  icon: Icon,
  title,
  description,
  fileType,
  loading,
  onDownload,
  secondaryDownload,
}: {
  icon: React.ElementType
  title: string
  description: string
  fileType: string
  loading: boolean
  onDownload: () => void
  secondaryDownload?: {
    label: string
    loading: boolean
    onDownload: () => void
  }
}) {
  return (
    <Card className="p-4 flex flex-col gap-3 min-w-0 justify-between">
      <div className="flex items-start gap-3 min-w-0">
        <span className="shrink-0 inline-flex p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</h3>
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {secondaryDownload ? `${fileType} & ${secondaryDownload.label}` : fileType}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>

      {secondaryDownload ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onDownload}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-60 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyiapkan…
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Unduh {fileType}
              </>
            )}
          </button>
          <button
            onClick={secondaryDownload.onDownload}
            disabled={secondaryDownload.loading}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors disabled:opacity-60"
            title={`Unduh file format ${secondaryDownload.label}`}
          >
            {secondaryDownload.loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-slate-400" /> {secondaryDownload.label}
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={onDownload}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Unduh
            </>
          )}
        </button>
      )}
    </Card>
  )
}

function Dropdown({
  icon: Icon,
  buttonLabel,
  open,
  setOpen,
  widthClass,
  children,
}: {
  icon: React.ElementType
  buttonLabel: string
  open: boolean
  setOpen: (v: boolean) => void
  widthClass: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, setOpen])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors max-w-full"
      >
        <Icon className="w-4 h-4 shrink-0 text-slate-400" />
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full mt-1 z-20 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md py-1 max-h-72 overflow-y-auto ${widthClass} max-w-[calc(100vw-2rem)]`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function Skeleton() {
  const block = 'bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg'
  return (
    <div className="space-y-5">
      <div className={`h-8 w-64 ${block}`} />
      <div className="flex flex-wrap gap-2">
        <div className={`h-9 w-48 ${block}`} />
        <div className={`h-9 w-40 ${block}`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-36 ${block}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-7 h-80 ${block}`} />
        <div className={`xl:col-span-5 h-80 ${block}`} />
      </div>
    </div>
  )
}

function StateCard({
  icon: Icon,
  tone,
  title,
  message,
  children,
}: {
  icon: React.ElementType
  tone: 'danger' | 'neutral'
  title: string
  message: string
  children?: React.ReactNode
}) {
  return (
    <Card className="max-w-lg mx-auto mt-12 p-8 text-center">
      <span
        className={`inline-flex p-3 rounded-full ${
          tone === 'danger'
            ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
        }`}
      >
        <Icon className="w-6 h-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </Card>
  )
}

const btnPrimary =
  'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors'
const btnSecondary =
  'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors'

// ─── Halaman ──────────────────────────────────────────────────────────────────

export default function ReportsClient({ role }: { role: string }) {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('ALL')
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [quarterOpen, setQuarterOpen] = useState(false)
  const [divisionOpen, setDivisionOpen] = useState(false)
  const [downloading, setDownloading] = useState<Record<string, boolean>>({})
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const fetchData = useCallback(async (quarter?: string, division?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (quarter) params.set('quarter', quarter)
      if (division && division !== 'ALL') params.set('division', division)
      const res = await fetch(`/api/reports?${params}`)
      if (res.status === 401 || res.status === 403) {
        setDenied(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ReportsData = await res.json()
      setData(json)
      setError(null)
      if (!quarter && json.meta.quarter) setSelectedQuarter(json.meta.quarter)
    } catch (e) {
      setError('Gagal memuat laporan. Periksa koneksi lalu coba lagi.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!downloadError) return
    const t = setTimeout(() => setDownloadError(null), 4000)
    return () => clearTimeout(t)
  }, [downloadError])

  const handleQuarterChange = (q: string) => {
    setSelectedQuarter(q)
    setQuarterOpen(false)
    fetchData(q, selectedDivision)
  }

  const handleDivisionChange = (d: string) => {
    setSelectedDivision(d)
    setDivisionOpen(false)
    fetchData(selectedQuarter, d)
  }

  const handleDownload = async (type: string, key: string) => {
    setDownloading((prev) => ({ ...prev, [key]: true }))
    try {
      const params = new URLSearchParams({ type })
      if (selectedQuarter) params.set('quarter', selectedQuarter)
      if (selectedDivision && selectedDivision !== 'ALL') params.set('division', selectedDivision)
      const res = await fetch(`/api/reports/export?${params}`)
      if (!res.ok) throw new Error('Export gagal')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'laporan'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setDownloadError('Gagal mengunduh laporan. Coba lagi.')
      console.error(e)
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }))
    }
  }

  // ─── State: permission denied ──────────────────────────────────────────────
  if (denied) {
    return (
      <StateCard
        icon={Lock}
        tone="danger"
        title="Anda tidak punya akses"
        message="Halaman laporan hanya bisa dibuka oleh Manager ke atas."
      >
        <Link href="/" className={btnPrimary}>
          Kembali ke Beranda
        </Link>
      </StateCard>
    )
  }

  // ─── State: loading awal ───────────────────────────────────────────────────
  if (loading && !data) return <Skeleton />

  // ─── State: error ──────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <StateCard icon={AlertTriangle} tone="danger" title="Gagal memuat laporan" message={error}>
        <button onClick={() => fetchData(selectedQuarter, selectedDivision)} className={btnPrimary}>
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </button>
      </StateCard>
    )
  }

  if (!data) return null

  const { kpi, divisionDistribution, bottlenecks, meta, options } = data

  const quarterLabel =
    options.availableQuarters.find((q) => q.value === selectedQuarter)?.label ?? meta.quarterLabel
  const divisionLabel =
    selectedDivision === 'ALL'
      ? 'Semua Divisi'
      : (options.divisionList.find((d) => d.id === selectedDivision)?.name ?? 'Semua Divisi')

  const totalAP = kpi.goalRealization.total
  const isEmpty = totalAP === 0 && divisionDistribution.every((d) => d.totalAPs === 0)
  const sortedDivisions = [...divisionDistribution].sort((a, b) => b.completionPct - a.completionPct)
  const totalDivisionAP = divisionDistribution.reduce((s, d) => s + d.totalAPs, 0)
  const trend = kpi.goalRealization.trend
  const worstDivision = sortedDivisions[sortedDivisions.length - 1]
  const topBottleneck = [...bottlenecks].sort((a, b) => b.count - a.count)[0]

  const updatedAt = new Date(meta.generatedAt).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  // ─── Toolbar (dipakai di state normal maupun kosong) ───────────────────────
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown
        icon={Calendar}
        buttonLabel={quarterLabel}
        open={quarterOpen}
        setOpen={setQuarterOpen}
        widthClass="w-72"
      >
        {options.availableQuarters.map((q) => (
          <DropdownItem
            key={q.value}
            active={q.value === selectedQuarter}
            onClick={() => handleQuarterChange(q.value)}
          >
            {q.label}
          </DropdownItem>
        ))}
      </Dropdown>

      {/* Manager terkunci ke divisinya sendiri — API mengabaikan filter ini */}
      {role !== 'MANAGER' && options.divisionList.length > 0 && (
        <Dropdown
          icon={Users}
          buttonLabel={divisionLabel}
          open={divisionOpen}
          setOpen={setDivisionOpen}
          widthClass="w-60"
        >
          <DropdownItem active={selectedDivision === 'ALL'} onClick={() => handleDivisionChange('ALL')}>
            Semua Divisi
          </DropdownItem>
          {options.divisionList.map((d) => (
            <DropdownItem
              key={d.id}
              active={d.id === selectedDivision}
              onClick={() => handleDivisionChange(d.id)}
            >
              {d.name}
            </DropdownItem>
          ))}
        </Dropdown>
      )}

      <button
        onClick={() => fetchData(selectedQuarter, selectedDivision)}
        disabled={loading}
        className={btnSecondary}
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        Muat Ulang
      </button>
    </div>
  )

  const header = (
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Laporan Kinerja
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Ringkasan penyelesaian action plan, kecepatan pengerjaan, dan kelengkapan bukti kerja per periode.
      </p>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        {[meta.companyName, quarterLabel, divisionLabel].filter(Boolean).join(' · ')} · diperbarui {updatedAt}
      </p>
    </div>
  )

  // ─── State: belum ada data di periode ini ──────────────────────────────────
  if (isEmpty) {
    return (
      <div className="space-y-5">
        {header}
        {toolbar}
        <StateCard
          icon={BarChart3}
          tone="neutral"
          title="Belum ada action plan di periode ini"
          message="Pilih periode lain, atau mulai dengan membuat action plan baru."
        >
          <Link href="/action-plans" className={btnPrimary}>
            Buka Action Plans
          </Link>
        </StateCard>
      </div>
    )
  }

  return (
    <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {header}
      {toolbar}

      {/* ─── Angka utama ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          accent="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
          label="Penyelesaian Action Plan"
          value={String(kpi.goalRealization.value)}
          unit="%"
          context={`${kpi.goalRealization.completed} dari ${kpi.goalRealization.total} selesai`}
          footer={
            trend === null ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Tidak ada data pembanding di {kpi.goalRealization.prevQuarter}
              </p>
            ) : (
              <p
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  trend > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : trend < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {trend > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : null}
                <span className="tabular-nums">
                  {trend > 0 ? '+' : ''}
                  {trend} poin
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  vs {kpi.goalRealization.prevQuarter}
                </span>
              </p>
            )
          }
        />

        <StatCard
          icon={Clock}
          accent="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
          label="Rata-rata Waktu Selesai"
          value={String(kpi.resolutionSLA.value)}
          unit={kpi.resolutionSLA.unit}
          context="Dihitung dari tanggal mulai hingga selesai (Action Plan COMPLETE)"
        />

        <StatCard
          icon={ShieldCheck}
          accent="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
          label="Bukti Kerja Lengkap"
          value={String(kpi.evidenceCompliance.value)}
          unit="%"
          context={`${kpi.evidenceCompliance.audited} dari ${kpi.evidenceCompliance.total} action plan memiliki bukti valid`}
          footer={
            kpi.evidenceCompliance.pendingSignOff > 0 ? (
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tabular-nums">
                {kpi.evidenceCompliance.pendingSignOff} menunggu persetujuan
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Tidak ada yang menunggu persetujuan</p>
            )
          }
        />

        <StatCard
          icon={AlertTriangle}
          accent="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
          label="Tidak Terlambat"
          value={String(kpi.overdueRisk.value)}
          unit="%"
          context={
            kpi.overdueRisk.activeOverdue > 0
              ? `${kpi.overdueRisk.activeOverdue} action plan saat ini lewat tenggat`
              : 'Tidak ada action plan yang lewat tenggat'
          }
          footer={
            kpi.overdueRisk.activeOverdue > 0 ? (
              <Link
                href="/action-plans?status=OVERDUE"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Lihat yang terlambat <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : undefined
          }
        />
      </div>

      {/* ─── Rincian + penyimpangan ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Kinerja per divisi */}
        <Card className="xl:col-span-7 min-w-0">
          <SectionHead
            title="Kinerja per Divisi"
            subtitle="Tingkat penyelesaian action plan per divisi"
            action={
              <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0">
                <button
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium transition-colors ${
                    viewMode === 'table'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" /> Tabel
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium transition-colors ${
                    viewMode === 'chart'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" /> Grafik
                </button>
              </div>
            }
          />

          {sortedDivisions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tidak ada data untuk divisi ini di periode terpilih.
              </p>
              {selectedDivision !== 'ALL' && (
                <button
                  onClick={() => handleDivisionChange('ALL')}
                  className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Tampilkan semua divisi
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="text-left font-medium px-5 py-2.5">Divisi</th>
                    <th className="text-right font-medium px-3 py-2.5">Jumlah</th>
                    <th className="text-right font-medium px-3 py-2.5">Selesai</th>
                    <th className="text-right font-medium px-3 py-2.5">Terlambat</th>
                    <th className="text-left font-medium px-3 py-2.5 w-32">% Selesai</th>
                    <th className="text-left font-medium px-3 py-2.5">Status</th>
                    <th className="px-5 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedDivisions.map((div) => (
                    <tr
                      key={div.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-5 py-3 min-w-0">
                        <Link
                          href={`/action-plans?division=${div.id}`}
                          className="block min-w-0 group"
                          title={`Lihat action plan divisi ${div.name}`}
                        >
                          <span className="block truncate font-medium text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {div.name}
                          </span>
                          {div.head && (
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              Manager: {div.head}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {div.totalAPs}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {div.completedAPs}
                      </td>
                      <td
                        className={`px-3 py-3 text-right tabular-nums font-medium ${
                          div.overdueAPs > 0
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {div.overdueAPs}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Bar pct={div.completionPct} />
                          <span className="shrink-0 w-9 text-right text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                            {div.completionPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <GovernanceBadge level={div.governanceIndex} />
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/action-plans?division=${div.id}`}
                          className="inline-flex text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                          aria-label={`Lihat action plan divisi ${div.name}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {sortedDivisions.map((div) => (
                <Link key={div.id} href={`/action-plans?division=${div.id}`} className="block group min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1.5 min-w-0">
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {div.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      {div.completionPct}%
                    </span>
                  </div>
                  <Bar pct={div.completionPct} />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {div.completedAPs} dari {div.totalAPs} selesai
                    {div.overdueAPs > 0 && ` · ${div.overdueAPs} terlambat`}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {sortedDivisions.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Total {totalDivisionAP} action plan di {sortedDivisions.length} divisi pada periode ini
              </p>
            </div>
          )}
        </Card>

        {/* Penyebab keterlambatan */}
        <Card className="xl:col-span-5 min-w-0">
          <SectionHead
            title="Penyebab Keterlambatan"
            subtitle="Di mana action plan paling banyak tertahan"
          />

          <div className="p-5 space-y-5">
            {bottlenecks.every((b) => b.count === 0) ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tidak ada action plan yang tertahan pada periode ini.
              </p>
            ) : (
              bottlenecks.map((b) => (
                <div key={b.label} className="min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1.5 min-w-0">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{b.label}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      {b.count}
                    </span>
                  </div>
                  <Bar pct={b.share} tone="warning" />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="tabular-nums">{b.share}%</span> dari total hambatan — {b.description}
                  </p>
                </div>
              ))
            )}

            {topBottleneck && topBottleneck.count > 0 && (
              <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Saran</p>
                  <p className="mt-0.5 text-xs text-blue-800 dark:text-blue-300">
                    Hambatan terbanyak ada di &quot;{topBottleneck.label}&quot; ({topBottleneck.count} action
                    plan).
                    {worstDivision && worstDivision.completionPct < 60 && (
                      <> Divisi {worstDivision.name} paling perlu perhatian ({worstDivision.completionPct}% selesai).</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ─── Unduh ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Unduh Laporan</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Berisi data periode {quarterLabel}
          </p>
        </div>

        {downloadError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {downloadError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <DownloadCard
            icon={FileText}
            title="Ringkasan Kinerja Periode"
            description="Angka utama dan tabel kinerja seluruh divisi."
            fileType="PDF"
            loading={!!downloading.executive}
            onDownload={() => handleDownload('executive-pdf', 'executive')}
          />
          <DownloadCard
            icon={FileSpreadsheet}
            title="Daftar Bukti Kerja"
            description="Seluruh action plan beserta link bukti kerja, catatan review, dan kepatuhan SLA."
            fileType="Excel (.xlsx)"
            loading={!!downloading.evidenceXlsx}
            onDownload={() => handleDownload('evidence-xlsx', 'evidenceXlsx')}
            secondaryDownload={{
              label: 'CSV',
              loading: !!downloading.evidenceCsv,
              onDownload: () => handleDownload('evidence-csv', 'evidenceCsv'),
            }}
          />
          <DownloadCard
            icon={Users}
            title="Beban Kerja per PIC"
            description="Action plan yang sudah selesai beserta lama pengerjaannya."
            fileType="PDF"
            loading={!!downloading.workload}
            onDownload={() => handleDownload('workload-pdf', 'workload')}
          />
          <DownloadCard
            icon={BarChart3}
            title="Rekap Proposal"
            description="Proposal yang diajukan pada periode ini beserta statusnya."
            fileType="PDF"
            loading={!!downloading.proposal}
            onDownload={() => handleDownload('proposal-pdf', 'proposal')}
          />
        </div>
      </div>
    </div>
  )
}
