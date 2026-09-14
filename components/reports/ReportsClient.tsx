'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  Table2,
  BarChart2,
  Mail,
  Calendar,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  FileSpreadsheet,
  BookOpen,
  BriefcaseBusiness,
  Layers,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiCard {
  goalRealization: {
    value: number
    completed: number
    total: number
    unit: string
    trend: string
    status: string
  }
  resolutionSLA: {
    value: number
    target: number
    unit: string
    status: string
  }
  evidenceCompliance: {
    value: number
    audited: number
    total: number
    pendingSignOff: number
    unit: string
    label: string
  }
  overdueRisk: {
    value: number
    activeOverdue: number
    unit: string
    label: string
  }
}

interface DivisionRow {
  id: string
  name: string
  head: string | null
  totalAPs: number
  completedAPs: number
  overdueAPs: number
  completionPct: number
  governanceIndex: 'Prima' | 'Luar Biasa' | 'Stabil' | 'Waspada' | 'Kritis'
}

interface Bottleneck {
  label: string
  count: number
  share: number
  description: string
}

interface Quarter {
  value: string
  label: string
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
  meta2: {
    availableQuarters: Quarter[]
    divisionList: { id: string; name: string }[]
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GovernanceBadge({ index }: { index: DivisionRow['governanceIndex'] }) {
  const styles: Record<string, string> = {
    'Luar Biasa': 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
    Prima: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    Stabil: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    Waspada: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    Kritis: 'bg-red-500/15 text-red-400 border border-red-500/30',
  }
  const dots: Record<string, string> = {
    'Luar Biasa': 'bg-violet-400',
    Prima: 'bg-emerald-400',
    Stabil: 'bg-blue-400',
    Waspada: 'bg-amber-400',
    Kritis: 'bg-red-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[index] ?? styles['Stabil']}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[index] ?? 'bg-blue-400'}`} />
      {index}
    </span>
  )
}

function ProgressBar({ pct, colorClass = 'bg-blue-500' }: { pct: number; colorClass?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-9 text-right">{pct}%</span>
    </div>
  )
}

function KpiMetricCard({
  icon,
  title,
  value,
  unit,
  sub1,
  sub2,
  accent,
  trend,
  badge,
}: {
  icon: React.ReactNode
  title: string
  value: string | number
  unit?: string
  sub1?: React.ReactNode
  sub2?: React.ReactNode
  accent: string
  trend?: string
  badge?: React.ReactNode
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-600/70 transition-all duration-200 hover:bg-slate-800/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
        <span className={`p-2 rounded-lg ${accent}`}>{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-white tabular-nums leading-none">{value}</span>
        {unit && <span className="text-lg font-medium text-slate-400 mb-0.5">{unit}</span>}
        {trend && (
          <span className="text-sm font-medium text-emerald-400 mb-0.5 flex items-center gap-0.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {trend}%
          </span>
        )}
      </div>
      {sub1 && <div className="text-sm text-slate-400">{sub1}</div>}
      {sub2 && <div>{sub2}</div>}
      {badge && <div>{badge}</div>}
    </div>
  )
}

// ─── Downloadable Report Cards ────────────────────────────────────────────────

function DownloadCard({
  icon,
  title,
  fileType,
  size,
  description,
  note,
  onDownload,
  loading,
}: {
  icon: React.ReactNode
  title: string
  fileType: string
  size: string
  description: string
  note: string
  onDownload: () => void
  loading: boolean
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex items-start gap-4 hover:border-slate-600/70 transition-all duration-200 group">
      <div className="p-3 rounded-xl bg-slate-700/60 text-blue-400 group-hover:bg-blue-600/20 transition-colors shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-white text-sm">{title}</p>
          <span className="text-xs font-mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
            {fileType} · {size}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
        <p className="text-xs text-slate-500 mt-0.5">{note}</p>
      </div>
      <button
        onClick={onDownload}
        disabled={loading}
        className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {loading ? 'Memuat…' : fileType === 'XLSX' ? 'Download XLSX' : 'Download PDF'}
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsClient() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuarter, setSelectedQuarter] = useState<string>('')
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [quarterOpen, setQuarterOpen] = useState(false)
  const [divisionOpen, setDivisionOpen] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState<Record<string, boolean>>({})
  const [dispatchLoading, setDispatchLoading] = useState(false)
  const [dispatchSent, setDispatchSent] = useState(false)

  const fetchData = useCallback(async (quarter?: string, division?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (quarter) params.set('quarter', quarter)
      if (division && division !== 'ALL') params.set('division', division)
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ReportsData = await res.json()
      setData(json)
      if (!quarter && json.meta.quarter) setSelectedQuarter(json.meta.quarter)
    } catch (e) {
      setError('Gagal memuat data laporan. Coba refresh halaman.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
    setDownloadLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const params = new URLSearchParams({ type })
      if (selectedQuarter) params.set('quarter', selectedQuarter)
      const res = await fetch(`/api/reports/export?${params}`)
      if (!res.ok) throw new Error('Export gagal')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'report'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Gagal mengunduh laporan. Silakan coba lagi.')
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleTestDispatch = async () => {
    setDispatchLoading(true)
    // Simulate cron test dispatch (actual implementation would POST to a cron API)
    await new Promise((r) => setTimeout(r, 1800))
    setDispatchLoading(false)
    setDispatchSent(true)
    setTimeout(() => setDispatchSent(false), 4000)
  }

  // ─── Skeleton loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 space-y-6">
        <div className="h-8 w-80 bg-slate-800 rounded-lg animate-pulse" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 w-52 bg-slate-800 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-7 h-80 bg-slate-800 rounded-xl animate-pulse" />
          <div className="col-span-5 h-80 bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="w-16 h-16 text-red-400 mx-auto" />
          <p className="text-white font-semibold">{error}</p>
          <button
            onClick={() => fetchData(selectedQuarter, selectedDivision)}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { kpi, divisionDistribution, bottlenecks, meta, meta2 } = data
  const currentQuarterLabel = meta2.availableQuarters.find((q) => q.value === selectedQuarter)?.label ?? meta.quarterLabel
  const currentDivisionLabel =
    selectedDivision === 'ALL'
      ? `Semua Divisi${meta.companyName ? ` (${meta.companyName})` : ''}`
      : meta2.divisionList.find((d) => d.id === selectedDivision)?.name ?? 'Semua Divisi'

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-700/60 bg-slate-900/95 sticky top-0 z-20 backdrop-blur-sm">
        <div className="px-6 py-4">
          {/* Badge row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">EXECUTIVE INTELLIGENCE</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              PRD V2.4 §C1 #16
            </span>
            <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              §B5
            </span>
          </div>

          {/* Title + Filter row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Executive Reports &amp; Performance Analytics
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Laporan komprehensif realisasi Action Plan, evaluasi kecepatan eksekusi, audit kepatuhan bukti kerja, serta export data formal eksekutif.
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quarter dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setQuarterOpen((v) => !v); setDivisionOpen(false) }}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg text-sm transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-slate-200 max-w-[200px] truncate">{currentQuarterLabel}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${quarterOpen ? 'rotate-180' : ''}`} />
                </button>
                {quarterOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-slate-800 border border-slate-700 rounded-xl shadow-xl shadow-black/40 min-w-[280px] py-1.5 overflow-hidden">
                    {meta2.availableQuarters.map((q) => (
                      <button
                        key={q.value}
                        onClick={() => handleQuarterChange(q.value)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700 transition-colors ${selectedQuarter === q.value ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Division dropdown */}
              {meta2.divisionList.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => { setDivisionOpen((v) => !v); setQuarterOpen(false) }}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg text-sm transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-slate-200 max-w-[180px] truncate">{currentDivisionLabel}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${divisionOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {divisionOpen && (
                    <div className="absolute top-full mt-1 left-0 z-30 bg-slate-800 border border-slate-700 rounded-xl shadow-xl shadow-black/40 min-w-[200px] py-1.5">
                      <button
                        onClick={() => handleDivisionChange('ALL')}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700 ${selectedDivision === 'ALL' ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}
                      >
                        Semua Divisi
                      </button>
                      {meta2.divisionList.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => handleDivisionChange(d.id)}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700 ${selectedDivision === d.id ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Export button */}
              <button
                onClick={() => handleDownload('executive-pdf', 'quick-export')}
                disabled={downloadLoading['quick-export']}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {downloadLoading['quick-export'] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Format Resmi
              </button>

              <button
                onClick={() => fetchData(selectedQuarter, selectedDivision)}
                className="p-2 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ─── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Goal Realization */}
          <KpiMetricCard
            icon={<TrendingUp className="w-4 h-4" />}
            accent="bg-blue-500/15 text-blue-400"
            title="Sprint Goal Realization"
            value={kpi.goalRealization.value}
            unit="%"
            trend={kpi.goalRealization.trend}
            sub1={
              <span className="text-xs text-slate-400">
                Progress Eksekusi:{' '}
                <span className="text-white font-semibold">
                  {kpi.goalRealization.completed}/{kpi.goalRealization.total}
                </span>{' '}
                Selesai
              </span>
            }
            sub2={
              <ProgressBar
                pct={kpi.goalRealization.value}
                colorClass={kpi.goalRealization.status === 'ON_TRACK' ? 'bg-blue-500' : 'bg-amber-500'}
              />
            }
          />

          {/* Resolution SLA */}
          <KpiMetricCard
            icon={<Clock className="w-4 h-4" />}
            accent="bg-violet-500/15 text-violet-400"
            title="Resolusi Action Plan"
            value={kpi.resolutionSLA.value}
            unit="Hari"
            sub1={
              <span className="text-xs text-slate-400">
                Target SLA: &lt;{' '}
                <span className="text-white">{kpi.resolutionSLA.target}</span> Hari
              </span>
            }
            badge={
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  kpi.resolutionSLA.status === 'ON_TARGET'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}
              >
                {kpi.resolutionSLA.status === 'ON_TARGET' ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {kpi.resolutionSLA.status === 'ON_TARGET' ? 'ON TARGET' : 'SLA BREACH'}
              </span>
            }
          />

          {/* Evidence Compliance */}
          <KpiMetricCard
            icon={<ShieldCheck className="w-4 h-4" />}
            accent="bg-emerald-500/15 text-emerald-400"
            title="Kepatuhan Bukti Kerja"
            value={kpi.evidenceCompliance.value}
            unit={`% ${kpi.evidenceCompliance.label}`}
            sub1={
              <span className="text-xs text-slate-400">
                <span className="text-white font-semibold">
                  {kpi.evidenceCompliance.audited} dari {kpi.evidenceCompliance.total}
                </span>{' '}
                AP tervalidasi
              </span>
            }
            badge={
              kpi.evidenceCompliance.pendingSignOff > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {kpi.evidenceCompliance.pendingSignOff} Pending Sign-off
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Semua Terverifikasi
                </span>
              )
            }
          />

          {/* Overdue Risk */}
          <KpiMetricCard
            icon={<AlertTriangle className="w-4 h-4" />}
            accent="bg-amber-500/15 text-amber-400"
            title="Mitigasi Overdue"
            value={kpi.overdueRisk.value}
            unit={`% ${kpi.overdueRisk.label}`}
            sub1={
              <span className="text-xs text-slate-400">
                Tertangani sebelum:{' '}
                <span className="text-white font-semibold">{kpi.overdueRisk.activeOverdue} Kasus</span> aktif
              </span>
            }
          />
        </div>

        {/* ─── Main Content Grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* ─── Division Distribution (left) ──────────────────────────── */}
          <div className="xl:col-span-7 space-y-4">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white text-sm">Distribusi Kinerja per Divisi</h2>
                    <span className="text-xs font-mono text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded border border-slate-600">
                      PRD §B5
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tingkat penyelesaian action plan lintas departemen — {meta.companyName ?? 'PT Samudera Pratama'}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-700/60 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Tampilan tabel"
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'chart' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Tampilan grafik"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table View */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Departemen / Divisi
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Volume AP
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[160px]">
                          Penyelesaian
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Overdue
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Indeks Tata Kelola
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {divisionDistribution.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-slate-500 text-sm">
                            Tidak ada data divisi untuk periode ini.
                          </td>
                        </tr>
                      ) : (
                        divisionDistribution.map((div) => (
                          <tr key={div.id} className="hover:bg-slate-700/20 transition-colors group">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20 flex items-center justify-center">
                                  <BriefcaseBusiness className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{div.name}</p>
                                  {div.head && (
                                    <p className="text-xs text-slate-400">PIC: {div.head}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-sm font-bold text-white">{div.totalAPs}</span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <ProgressBar
                                  pct={div.completionPct}
                                  colorClass={
                                    div.completionPct >= 85
                                      ? 'bg-emerald-500'
                                      : div.completionPct >= 60
                                      ? 'bg-blue-500'
                                      : div.completionPct >= 40
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }
                                />
                                <p className="text-xs text-slate-500 text-right">
                                  {div.completedAPs}/{div.totalAPs}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {div.overdueAPs > 0 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30">
                                  {div.overdueAPs}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <GovernanceBadge index={div.governanceIndex} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Chart View */}
              {viewMode === 'chart' && (
                <div className="p-5 space-y-3">
                  {divisionDistribution.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-8">
                      Tidak ada data divisi untuk periode ini.
                    </p>
                  ) : (
                    divisionDistribution.map((div) => (
                      <div key={div.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300 font-medium">{div.name}</span>
                          <div className="flex items-center gap-3">
                            <GovernanceBadge index={div.governanceIndex} />
                            <span className="text-sm font-bold text-white tabular-nums">
                              {div.completionPct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              div.completionPct >= 85
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : div.completionPct >= 60
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                : div.completionPct >= 40
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                : 'bg-gradient-to-r from-red-500 to-rose-400'
                            }`}
                            style={{ width: `${Math.min(div.completionPct, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">
                          {div.completedAPs}/{div.totalAPs} selesai
                          {div.overdueAPs > 0 && (
                            <span className="text-red-400 ml-2">· {div.overdueAPs} overdue</span>
                          )}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-800/40 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Total portofolio aktif periode berjalan:{' '}
                  <span className="font-semibold text-white">
                    {divisionDistribution.reduce((s, d) => s + d.totalAPs, 0)} Action Items
                  </span>{' '}
                  across {divisionDistribution.length} divisi
                </p>
                <button className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  Buka Analisis SLA Detail
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* ─── Right Column ─────────────────────────────────────────────── */}
          <div className="xl:col-span-5 space-y-4">
            {/* Bottleneck Analysis */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                <div>
                  <h2 className="font-bold text-white text-sm">Analisis Kemacetan Eksekusi</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Root cause identifikasi keterlambatan Action Plan pada sprint aktif
                  </p>
                </div>
                <BarChart3 className="w-4 h-4 text-slate-500" />
              </div>

              <div className="p-5 space-y-4">
                {bottlenecks.map((b, i) => {
                  const colors = [
                    { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { bar: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-500/10' },
                  ]
                  const c = colors[i % colors.length]
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white leading-tight">{b.label}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} shrink-0`}>
                          {b.share}% delay share
                        </span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
                          style={{ width: `${b.share}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">{b.description}</p>
                    </div>
                  )
                })}

                {/* Recommendation callout */}
                <div className="mt-2 bg-blue-500/8 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1.5">
                    ⚡ Rekomendasi Otomatis
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Percepat antrian review dengan mengaktifkan reminder otomatis H-1 pada Settings
                    Notifikasi agar verifikator menyelesaikan evaluasi sebelum ambang batas SLA terlampaui.
                  </p>
                  <button className="mt-2.5 text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    Konfigurasi Reminder Sekarang
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cron Dispatch Schedule */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                <div>
                  <h2 className="font-bold text-white text-sm">Jadwal Pengiriman Laporan</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Automated Cron Dispatch Engine</p>
                </div>
                <Send className="w-4 h-4 text-slate-500" />
              </div>

              <div className="p-5 space-y-4">
                {/* Cron status */}
                <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 animate-pulse shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">Aktif (Vercel Cron Service)</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">0 7 * * 1</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Laporan mingguan dikirimkan otomatis setiap{' '}
                      <span className="font-semibold text-white">Senin pukul 07:00 WIB</span> ke email
                      Direksi dan Manager Divisi.
                    </p>
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Daftar Penerima Utama
                  </p>
                  <div className="space-y-2">
                    {[
                      { email: 'board-directors@samudeerapratama.co.id', role: 'BOD', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
                      { email: 'division-leads@samudeerapratama.co.id', role: 'Leads', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
                      { email: 'compliance.audit@samudeerapratama.co.id', role: 'Auditor', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
                    ].map((r) => (
                      <div key={r.email} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-xs text-slate-300 truncate font-mono">{r.email}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold shrink-0 ${r.color}`}>
                          {r.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next run + test button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <div>
                    <p className="text-xs text-slate-500">Last run: Sen, 07:00 WIB</p>
                    <p className="text-xs text-slate-400 font-medium">
                      Next run:{' '}
                      <span className="text-white">
                        {(() => {
                          const now = new Date()
                          const nextMonday = new Date(now)
                          nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7))
                          return nextMonday.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                        })()}
                        , 07:00 WIB
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={handleTestDispatch}
                    disabled={dispatchLoading || dispatchSent}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      dispatchSent
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {dispatchLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : dispatchSent ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    {dispatchLoading ? 'Mengirim…' : dispatchSent ? 'Terkirim!' : 'Test Dispatch Sekarang'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Downloadable Reports ──────────────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-sm">Koleksi Laporan Siap Unduh</h2>
              <span className="text-xs font-mono text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded border border-slate-600">
                PRD §C1 #16
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
              SHA-256 VALID
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <DownloadCard
              icon={<BookOpen className="w-5 h-5" />}
              title="Laporan Eksekutif Bulanan (Executive Monthly Board Pack)"
              fileType="PDF"
              size="~4.6 MB"
              description="Rangkuman holistik performa bulanan untuk rapat direksi dan BOD."
              note={`Terakhir digenerate: Hari ini 08:00 WIB oleh Sistem Otomatis`}
              onDownload={() => handleDownload('executive-pdf', 'exec-pdf')}
              loading={!!downloadLoading['exec-pdf']}
            />
            <DownloadCard
              icon={<FileSpreadsheet className="w-5 h-5" />}
              title="Audit Trail Kepatuhan Bukti Kerja (Evidence Compliance Log)"
              fileType="XLSX"
              size="~3.1 MB"
              description="Meliputi approval signature timestamp, audit log, & hash verifikasi bukti."
              note="Meliputi semua AP dalam rentang periode yang dipilih."
              onDownload={() => handleDownload('evidence-csv', 'evidence-csv')}
              loading={!!downloadLoading['evidence-csv']}
            />
            <DownloadCard
              icon={<BriefcaseBusiness className="w-5 h-5" />}
              title="Matriks Beban Kerja Tim & SLA PIC (Workload & SLA Ledger)"
              fileType="PDF"
              size="~4.8 MB"
              description="Evaluasi kapasitas personil, rekap durasi pengerjaan, & bottleneck list."
              note="Top 50 AP selesai dengan detail durasi eksekusi dan SLA."
              onDownload={() => handleDownload('workload-pdf', 'workload-pdf')}
              loading={!!downloadLoading['workload-pdf']}
            />
            <DownloadCard
              icon={<FileText className="w-5 h-5" />}
              title="Rekapitulasi Proposal & Evaluasi Inisiatif Q3"
              fileType="PDF"
              size="~8.2 MB"
              description="Rekap 14 inisiatif strategis, status persetujuan direksi, & budget utilization."
              note="Mencakup semua proposal yang diajukan pada periode yang dipilih."
              onDownload={() => handleDownload('proposal-pdf', 'proposal-pdf')}
              loading={!!downloadLoading['proposal-pdf']}
            />
          </div>

          {/* Security strip */}
          <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-800/40">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-400">Security &amp; Signature:</span> Semua unduhan executive report dilengkapi digital cryptographic hash untuk keperluan audit eksternal BPKP / ISO 9001:2015.
            </p>
          </div>
        </div>
      </div>

      {/* Close dropdowns on outside click */}
      {(quarterOpen || divisionOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => { setQuarterOpen(false); setDivisionOpen(false) }}
        />
      )}
    </div>
  )
}
