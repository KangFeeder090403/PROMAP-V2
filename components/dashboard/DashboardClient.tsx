'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  BellRing,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  FileText,
  Gavel,
  Loader2,
  Paperclip,
  PlayCircle,
  User,
  Users,
  X,
  SlidersHorizontal,
  Layers,
  LayoutDashboard,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { FilterPopover } from '@/components/ui/FilterPopover'
import { ActiveChip } from '@/components/ui/FilterToolbar'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DonutChart } from '@/components/charts/DonutChart'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { PortfolioSection } from '@/components/dashboard/PortfolioSection'
import { PriorityRiskMatrix } from '@/components/dashboard/PriorityRiskMatrix'
import { DivisionVelocityCard } from '@/components/dashboard/DivisionVelocityCard'
import { ContributorAnalysisSection } from '@/components/dashboard/ContributorAnalysisSection'

const ExecutionVelocityChart = dynamic(
  () => import('@/components/dashboard/ExecutionVelocityChart').then((m) => m.ExecutionVelocityChart),
  { ssr: false }
)
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  AP_STATUS_STYLE,
  AP_STATUS_LABEL,
  PROPOSAL_STATUS_STYLE,
  PROPOSAL_STATUS_LABEL,
} from '@/lib/status-labels'
import type { ActionRequiredItem, DashboardApiResponse, OverdueRow } from '@/lib/types/dashboard'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { ActionPlanDetail } from '@/components/action-plans/ActionPlanDetail'
import * as DialogPrimitive from '@radix-ui/react-dialog'

type Range = 'today' | 'week' | 'month' | 'quarter' | 'all'

/**
 * Beban Kerja Tim ditunda atas keputusan Product Owner (2026-09-09).
 * Komponennya SENGAJA tidak dihapus — PRD §B5 & §B10 UI-3 masih menyebutnya wajib.
 * Ubah ke true untuk mengembalikannya.
 */
const SHOW_TEAM_WORKLOAD = false

/** Baris overdue yang ditampilkan; API mengirim lebih banyak sebagai kandidat sort. */
const OVERDUE_VISIBLE = 10

/** Label kuartal ikut tanggal hari ini — jangan di-hardcode. */
function currentQuarterLabel(now = new Date()) {
  return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
}

const RANGE_TABS: { key: Range; label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'week', label: 'Minggu Ini' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'quarter', label: currentQuarterLabel() },
  { key: 'all', label: 'Semua' },
]

type OverdueSort = 'lateDesc' | 'deadlineDesc' | 'priority' | 'createdDesc'

const SORT_OPTIONS: { key: OverdueSort; label: string }[] = [
  { key: 'lateDesc', label: 'Terlama terlambat' },
  { key: 'deadlineDesc', label: 'Tenggat terdekat' },
  { key: 'priority', label: 'Prioritas tertinggi' },
  { key: 'createdDesc', label: 'Terbaru dibuat' },
]

/** Prioritas AP — label & warna dari promap-design (High=red, Medium=amber, Low=slate). */
const PRIORITY_META = {
  HIGH: { label: 'High', dot: 'bg-red-500', bar: 'bg-red-500' },
  MEDIUM: { label: 'Medium', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  LOW: { label: 'Low', dot: 'bg-slate-400', bar: 'bg-slate-400' },
} as const

const AR_STATUS_OPTIONS = [
  { value: 'PENDING_APPROVAL', label: 'Menunggu Review' },
  { value: 'EVIDENCE_REQUIRED', label: 'Perlu Bukti' },
  { value: 'SUBMITTED', label: 'Proposal Diajukan' },
]

const AR_TYPE_OPTIONS = [
  { value: 'AP', label: 'Action Plan' },
  { value: 'PROPOSAL', label: 'Usulan Ide (Proposal)' },
]

function sortOverdue(rows: OverdueRow[], by: OverdueSort): OverdueRow[] {
  const riskRank = (r: OverdueRow['risk']) => (r === 'CRITICAL' ? 0 : r === 'HIGH' ? 1 : 2)
  const copy = [...rows]
  if (by === 'deadlineDesc') {
    return copy.sort((a, b) => +new Date(b.deadline) - +new Date(a.deadline))
  }
  if (by === 'priority') {
    return copy.sort((a, b) => riskRank(a.risk) - riskRank(b.risk) || b.lateDays - a.lateDays)
  }
  if (by === 'createdDesc') {
    return copy.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0
      if (!a.createdAt) return 1
      if (!b.createdAt) return -1
      return +new Date(b.createdAt) - +new Date(a.createdAt)
    })
  }
  return copy.sort((a, b) => b.lateDays - a.lateDays || riskRank(a.risk) - riskRank(b.risk))
}

const RISK_LABEL = { CRITICAL: 'Tinggi', HIGH: 'Sedang', MEDIUM: 'Rendah' } as const
const RISK_STYLE = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 dark:border dark:border-red-500/20',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 dark:border dark:border-amber-500/20',
  MEDIUM: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border dark:border-slate-700',
} as const
const RISK_DOT = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-amber-500',
  MEDIUM: 'bg-slate-400',
} as const

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const btnBase =
  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors'

/** Tombol Ingatkan PIC — status dari hasil POST /remind (429 = sudah dikirim 24 jam). */
function RemindButton({
  state,
  onClick,
}: {
  state: 'sending' | 'sent' | 'limited' | 'error' | undefined
  onClick: () => void
}) {
  if (state === 'sending') {
    return (
      <button disabled className={`${btnBase} bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 cursor-wait shrink-0`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        <span className="hidden sm:inline">Mengirim…</span>
      </button>
    )
  }
  if (state === 'sent') {
    return (
      <span className={`${btnBase} bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0`}>
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Terkirim</span>
      </span>
    )
  }
  if (state === 'limited') {
    return (
      <span
        title="Pengingat sudah dikirim dalam 24 jam terakhir"
        className={`${btnBase} bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 shrink-0`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 sm:hidden" aria-hidden="true" />
        <span className="hidden sm:inline">Sudah diingatkan</span>
      </span>
    )
  }
  return (
    <button
      onClick={onClick}
      title="Kirim pengingat ke PIC"
      className={`${btnBase} shrink-0 ${
        state === 'error'
          ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="hidden xl:inline">{state === 'error' ? 'Gagal' : 'Ingatkan'}</span>
    </button>
  )
}

type PicOption = { id: string; name: string }

type RemindState = Record<string, 'sending' | 'sent' | 'limited' | 'error'>

export function DashboardClient() {
  const [data, setData] = useState<DashboardApiResponse | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<Range>('week')
  const [picFilter, setPicFilter] = useState('')
  const [picOptions, setPicOptions] = useState<PicOption[]>([])
  const [overdueSort, setOverdueSort] = useState<OverdueSort>('lateDesc')
  const [preview, setPreview] = useState<ActionRequiredItem | null>(null)
  const [remindState, setRemindState] = useState<RemindState>({})
  const [selectedAP, setSelectedAP] = useState<ActionPlan | null>(null)
  const [arFilterOpen, setArFilterOpen] = useState(false)
  const [arTypeFilter, setArTypeFilter] = useState('')
  const [arStatusFilters, setArStatusFilters] = useState<string[]>([])
  const [activeDashboardView, setActiveDashboardView] = useState<'portfolio' | 'operational'>('portfolio')
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'HIGH' | 'OVERDUE' | 'OPTIMAL'>('ALL')
  const [workloadExpanded, setWorkloadExpanded] = useState(false)
  const reqRef = useRef(0)

  const handleOpenAPDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/action-plans/${id}`)
      if (res.ok) {
        const ap = await res.json()
        setSelectedAP(ap)
      } else {
        window.location.href = `/action-plans?open=${id}&highlight=${id}`
      }
    } catch {
      window.location.href = `/action-plans?open=${id}&highlight=${id}`
    }
  }, [])

  const fetchData = useCallback(async (r: Range, pic: string, isInitial: boolean) => {
    const reqId = ++reqRef.current
    if (!isInitial) setSwitching(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ range: r })
      if (pic) qs.set('pic', pic)
      const res = await fetch(`/api/dashboard?${qs.toString()}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      const json = await res.json()
      if (reqRef.current === reqId) setData(json)
    } catch {
      if (reqRef.current === reqId) {
        setError(isInitial ? 'Terjadi kesalahan. Coba lagi.' : 'Gagal memuat untuk rentang yang dipilih.')
      }
    } finally {
      if (reqRef.current === reqId) {
        if (isInitial) setInitialLoading(false)
        setSwitching(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchData('week', '', true)
  }, [fetchData])

  // Daftar PIC untuk dropdown. Endpoint sudah ter-scope per role; PIC dapat 403.
  useEffect(() => {
    if (!data || data.user.roleLabel === 'PIC') return
    let alive = true
    void (async () => {
      try {
        const res = await fetch('/api/users')
        if (!res.ok) return
        const rows: { id: string; name: string; status: string }[] = await res.json()
        if (!alive) return
        setPicOptions(
          rows
            .filter((u) => u.status === 'ACTIVE')
            .map((u) => ({ id: u.id, name: u.name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'id'))
        )
      } catch {
        // Dropdown opsional — kegagalan tidak boleh merusak dashboard.
      }
    })()
    return () => {
      alive = false
    }
  }, [data])

  const handleRangeChange = (r: Range) => {
    if (r === range) return
    setRange(r)
    void fetchData(r, picFilter, false)
  }

  const handlePicChange = (pic: string) => {
    setPicFilter(pic)
    void fetchData(range, pic, false)
  }

  const handleRemind = async (id: string) => {
    setRemindState((s) => ({ ...s, [id]: 'sending' }))
    try {
      const res = await fetch(`/api/action-plans/${id}/remind`, { method: 'POST' })
      if (res.status === 429) {
        setRemindState((s) => ({ ...s, [id]: 'limited' }))
        return
      }
      setRemindState((s) => ({ ...s, [id]: res.ok ? 'sent' : 'error' }))
    } catch {
      setRemindState((s) => ({ ...s, [id]: 'error' }))
    }
  }

  if (initialLoading) return <DashboardSkeleton />

  if (!data && error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
        <button
          onClick={() => void fetchData(range, picFilter, true)}
          className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (!data) return <DashboardSkeleton />

  const { user, metrics, statusBreakdown, priorityBreakdown, picWorkload, actionRequired, overdueList } = data
  const isPic = user.role === 'PIC' || user.roleLabel === 'PIC'
  const hasPicFilter = picFilter !== ''
  const selectedPicName = picOptions.find((p) => p.id === picFilter)?.name ?? null

  const filteredActionRequired = (actionRequired ?? []).filter((item) => {
    if (arTypeFilter && item.kind !== arTypeFilter) return false
    if (arStatusFilters.length > 0 && !arStatusFilters.includes(item.status)) return false
    return true
  })

  // Overdue disortir di client (keputusan PO 2026-09-09) lalu dipotong 10 teratas.
  const overdueSorted = sortOverdue(overdueList, overdueSort)
  const overdueShown = overdueSorted.slice(0, OVERDUE_VISIBLE)
  // API mengirim maksimal OVERDUE_CANDIDATES; kalau penuh, total sebenarnya bisa lebih.
  const overdueMore = overdueList.length >= 100

  const highCount = picWorkload.filter((w) => (w.overdue >= 1 && w.total >= 6) || w.total >= 8).length
  const overduePicCount = picWorkload.filter((w) => w.overdue > 0).length
  const optimalCount = picWorkload.filter((w) => w.overdue === 0).length

  const filteredPicWorkload = picWorkload.filter((w) => {
    if (workloadFilter === 'HIGH') return (w.overdue >= 1 && w.total >= 6) || w.total >= 8
    if (workloadFilter === 'OVERDUE') return w.overdue > 0
    if (workloadFilter === 'OPTIMAL') return w.overdue === 0
    return true
  })

  const displayedPicWorkload = workloadExpanded
    ? filteredPicWorkload
    : filteredPicWorkload.slice(0, 5)

  const subtitleBits = [
    user.divisionName ? `Divisi ${user.divisionName}` : null,
    user.companyName ?? null,
  ].filter(Boolean)

  // Ringkasan satu kalimat — pengganti tagline dekoratif. Prioritas: masalah dulu.
  const headline =
    metrics.total === 0
      ? 'Belum ada rencana aksi pada rentang ini.'
      : metrics.overdue > 0
        ? `${metrics.overdue} rencana aksi lewat tenggat dan ${actionRequired.length} menunggu keputusan Anda.`
        : actionRequired.length > 0
          ? `${actionRequired.length} item menunggu keputusan Anda. Tidak ada yang lewat tenggat.`
          : `Semua ${metrics.total} rencana aksi berjalan sesuai jadwal.`

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${switching ? 'opacity-60 pointer-events-none' : ''}`}>
      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => void fetchData(range, picFilter, false)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
          >
            Ulangi
          </button>
        </div>
      )}
      {/* Contextual Banner, Time Filter & Sub-view Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 pb-0 sm:pb-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {subtitleBits.join(' · ') || user.roleLabel}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              {data.greeting}, {user.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">{headline}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
            {!isPic && (
              <select
                value={picFilter}
                onChange={(e) => handlePicChange(e.target.value)}
                disabled={switching}
                aria-label="Filter berdasarkan PIC"
                className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
              >
                <option value="">Semua PIC</option>
                {picOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <div
              className="flex-1 min-w-0 lg:flex-none flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto whitespace-nowrap"
              aria-busy={switching}
            >
              {RANGE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleRangeChange(tab.key)}
                  disabled={switching}
                  aria-current={range === tab.key ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:cursor-not-allowed ${
                    range === tab.key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-semibold shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {switching && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Memuat…
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher Mode Tampilan (Gaya Navigasi Terintegrasi Linear / Stripe) */}
        {!isPic && data.portfolio && (
          <div className="flex items-center gap-6 border-t border-slate-100 dark:border-slate-800 -mx-5 sm:-mx-6 px-5 sm:px-6">
            <button
              type="button"
              onClick={() => setActiveDashboardView('portfolio')}
              className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                activeDashboardView === 'portfolio'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" aria-hidden="true" />
              <span>Portofolio Eksekutif</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDashboardView('operational')}
              className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                activeDashboardView === 'operational'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span>Operasional Rencana Aksi</span>
            </button>
          </div>
        )}
      </div>

      {!isPic && data.portfolio && activeDashboardView === 'portfolio' ? (
        <section aria-label="Ringkasan Eksekutif Portofolio Proyek" className="w-full min-w-0">
          <PortfolioSection
            portfolio={data.portfolio}
            user={user}
            greeting={data.greeting}
            userRole={user.role}
            actionRequired={actionRequired}
            onOpenActionItem={(item) => {
              if (item.kind === 'AP') handleOpenAPDetail(item.id)
              else setPreview(item)
            }}
          />
        </section>
      ) : (
        <div className="space-y-6 w-full min-w-0">
          {/* 4 Kartu Metrik Inti (Stitch Style - Terlihat untuk Semua Role) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full min-w-0">
        <MetricCard
          label="Total Rencana Aksi"
          value={metrics.total}
          icon={ClipboardList}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
          badge={
            <svg className="w-14 h-6 shrink-0 opacity-80" viewBox="0 0 56 20" fill="none">
              <path
                d="M 2 16 C 12 14, 18 8, 30 10 C 40 12, 46 5, 54 3"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="54" cy="3" r="2" fill="#2563EB" />
            </svg>
          }
          footer="Target rencana aksi pada rentang ini"
        />
        <MetricCard
          label="Selesai"
          value={metrics.complete}
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
          badge={
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
              {Math.round(metrics.completionRate)}%
            </span>
          }
          progress={metrics.completionRate}
          footer={`${metrics.complete} dari ${metrics.total} AP tuntas (${Math.round(metrics.completionRate)}%)`}
        />
        <MetricCard
          label="Sedang Berjalan"
          value={metrics.inProgress}
          icon={PlayCircle}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
          footer={
            <div className="space-y-2">
              {(() => {
                const activeOnly = Math.max(0, metrics.inProgress - metrics.inReview)
                const totalActive = Math.max(metrics.inProgress, 1)
                const activePct = Math.round((activeOnly / totalActive) * 100)
                const reviewPct = 100 - activePct
                return (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500 rounded-l-full transition-all" style={{ width: `${activePct}%` }} />
                    <div className="h-full bg-indigo-500 rounded-r-full transition-all" style={{ width: `${reviewPct}%` }} />
                  </div>
                )
              })()}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{Math.max(0, metrics.inProgress - metrics.inReview)} aktif</span>
                </span>
                <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>{metrics.inReview} review</span>
                </span>
              </div>
            </div>
          }
        />
        <MetricCard
          label="Lewat Tenggat"
          value={metrics.overdue}
          valueClass={metrics.overdue > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-slate-50'}
          icon={AlertTriangle}
          iconClass={
            metrics.overdue > 0
              ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300'
              : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }
          badge={
            metrics.overdue > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 dark:border dark:border-orange-800/40 text-orange-700 dark:text-orange-300 text-xs font-semibold">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                Perlu Tindakan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 dark:border dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                Terkendali
              </span>
            )
          }
          footer={
            overdueList.length > 0
              ? `Terlama: ${overdueList[0].title} (${overdueList[0].lateDays} hari)`
              : 'Semua target waktu aman terkendali'
          }
        />
      </div>

      {/* Action Required (Menunggu Keputusan Anda) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 flex items-center justify-center">
              <Gavel className="w-5 h-5" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Menunggu Keputusan Anda</h2>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-semibold">
              {filteredActionRequired.length}{filteredActionRequired.length !== actionRequired.length ? ` dari ${actionRequired.length}` : ''} item
            </span>
          </div>

          {/* Quick Filter Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setArFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                arFilterOpen || arTypeFilter || arStatusFilters.length > 0
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
              <span>Filter Cepat</span>
              {(arTypeFilter || arStatusFilters.length > 0) && (
                <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white text-blue-700 px-1 text-[10px] font-bold">
                  {(arTypeFilter ? 1 : 0) + arStatusFilters.length}
                </span>
              )}
            </button>

            <FilterPopover
              isOpen={arFilterOpen}
              onClose={() => setArFilterOpen(false)}
              onApply={(draft) => {
                setArTypeFilter(draft.customType ?? '')
                setArStatusFilters(draft.statuses)
              }}
              initialValues={{
                statuses: arStatusFilters,
                customType: arTypeFilter,
              }}
              config={{
                customTypes: AR_TYPE_OPTIONS,
                customTypeLabel: 'Tipe Dokumen',
                statuses: AR_STATUS_OPTIONS,
                priorities: false,
                divisions: false,
                pics: false,
                projects: false,
                dateRange: false,
                entityName: 'Item Keputusan',
                totalEntities: actionRequired.length,
              }}
              totalResults={filteredActionRequired.length}
              align="right"
            />
          </div>
        </div>

        {/* Active Chips Row */}
        {(arTypeFilter || arStatusFilters.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3 px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 shrink-0">
              FILTER AKTIF:
            </span>
            {arTypeFilter && (
              <ActiveChip
                label={`Tipe: ${AR_TYPE_OPTIONS.find((t) => t.value === arTypeFilter)?.label ?? arTypeFilter}`}
                dot="bg-indigo-500"
                onRemove={() => setArTypeFilter('')}
              />
            )}
            {arStatusFilters.map((st) => (
              <ActiveChip
                key={st}
                label={`Status: ${AR_STATUS_OPTIONS.find((s) => s.value === st)?.label ?? st}`}
                onRemove={() => setArStatusFilters((prev) => prev.filter((s) => s !== st))}
              />
            ))}
            <button
              type="button"
              onClick={() => {
                setArTypeFilter('')
                setArStatusFilters([])
              }}
              className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
            >
              Hapus filter
            </button>
          </div>
        )}

        {filteredActionRequired.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {arTypeFilter || arStatusFilters.length > 0
                ? 'Tidak ada item keputusan yang sesuai filter yang dipilih.'
                : 'Semua sudah beres — tidak ada item yang menunggu.'}
            </p>
            {(arTypeFilter || arStatusFilters.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setArTypeFilter('')
                  setArStatusFilters([])
                }}
                className="mt-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredActionRequired.map((item) => {
              const isAP = item.kind === 'AP'
              const isApproval = isAP && item.status === 'PENDING_APPROVAL'
              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isAP) handleOpenAPDetail(item.id)
                    else setPreview(item)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (isAP) handleOpenAPDetail(item.id)
                      else setPreview(item)
                    }
                  }}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`p-2 rounded flex-shrink-0 mt-0.5 ${
                        isAP
                          ? isApproval
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                      }`}
                    >
                      {isAP ? (
                        isApproval ? (
                          <PlayCircle className="w-5 h-5" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                        )
                      ) : (
                        <FileText className="w-5 h-5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700">
                          #{item.refCode}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate max-w-sm">
                          {item.title}
                        </span>
                        <StatusBadge
                          status={item.status}
                          styleMap={isAP ? AP_STATUS_STYLE : PROPOSAL_STATUS_STYLE}
                          labelMap={isAP ? AP_STATUS_LABEL : PROPOSAL_STATUS_LABEL}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" aria-hidden="true" />
                          {isAP ? 'PIC: ' : 'Pengusul: '}
                          <strong className="font-medium text-slate-700 dark:text-slate-300">{item.picName}</strong>
                        </span>
                        {item.createdAt && (
                          <span className="font-mono">
                            {isAP ? 'Dibuat: ' : 'Diajukan: '}
                            {fmtDate(item.createdAt)}
                          </span>
                        )}
                        {isAP && item.deadline && (
                          <span className="font-mono">Deadline: {fmtDate(item.deadline)}</span>
                        )}
                        {item.evidenceLink && (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                            <span className="truncate max-w-[180px]">{item.evidenceLink}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 flex-shrink-0">
                    {isAP && isApproval && (
                      isPic ? (
                        <span className="flex items-center text-xs text-slate-400 dark:text-slate-500 font-medium group-hover:text-slate-600">
                          Menunggu Review <ChevronRight className="w-4 h-4 ml-1" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenAPDetail(item.id)
                          }}
                          className={`${btnBase} w-32 bg-blue-500 text-white hover:bg-blue-600 shadow-sm font-semibold text-center`}
                        >
                          Review Bukti
                        </button>
                      )
                    )}
                    {isAP && !isApproval && (
                      isPic ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenAPDetail(item.id)
                          }}
                          className={`${btnBase} w-32 bg-blue-500 text-white hover:bg-blue-600 shadow-sm font-semibold text-center`}
                        >
                          {item.status === 'REJECTED' ? 'Perbaiki' : 'Unggah Bukti'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemind(item.id)
                          }}
                          className={`${btnBase} w-32 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 text-center`}
                        >
                          Ingatkan PIC
                        </button>
                      )
                    )}
                    {!isAP && (
                      isPic ? (
                        <span className="flex items-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                          Menunggu Approval <ChevronRight className="w-4 h-4 ml-1" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreview(item)
                          }}
                          className={`${btnBase} w-36 bg-blue-500 text-white hover:bg-blue-600 shadow-sm font-semibold text-center`}
                        >
                          Review Proposal
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Baris Analisis 1: Laju Eksekusi & Burndown + Sebaran Status AP */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full min-w-0">
        <div className="xl:col-span-7 w-full min-w-0">
          <ExecutionVelocityChart
            total={metrics.total}
            complete={metrics.complete}
            inProgress={metrics.inProgress}
            inReview={metrics.inReview}
            overdue={metrics.overdue}
            completionRate={metrics.completionRate}
          />
        </div>

        <div className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between w-full min-w-0">
          <div>
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Sebaran Status</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {metrics.total} rencana aksi pada rentang ini
                </span>
              </div>
            </div>
            <DonutChart
              data={statusBreakdown}
              center={{ value: metrics.total, label: 'Total AP' }}
              legendLayout="grid"
            />
          </div>
          <div className="mt-4 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Realisasi Selesai</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.complete} dari {metrics.total} ({Math.round(metrics.completionRate)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Baris Analisis 2: Beban Kerja Tim + Matriks Prioritas & Risiko */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full min-w-0">
        <div className="xl:col-span-7 w-full min-w-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 w-full min-w-0">
            {/* Header Beban Kerja Tim + Status Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <Users className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    Beban Kerja Tim
                  </h3>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {picWorkload.length} Anggota
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Distribusi penugasan rencana aksi dan pemantauan kapasitas tim
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-orange-500" aria-hidden="true" /> Terlambat
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-indigo-500" aria-hidden="true" /> Review
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-blue-500" aria-hidden="true" /> Dikerjakan
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-emerald-500" aria-hidden="true" /> Selesai
                </span>
              </div>
            </div>

            {/* Filter Status Beban Kerja */}
            {picWorkload.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    workloadFilter === 'ALL'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Semua ({picWorkload.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('HIGH')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    workloadFilter === 'HIGH'
                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 font-semibold border border-orange-200 dark:border-orange-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Beban Tinggi ({highCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('OVERDUE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    workloadFilter === 'OVERDUE'
                      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 font-semibold border border-red-200 dark:border-red-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Ada Terlambat ({overduePicCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('OPTIMAL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    workloadFilter === 'OPTIMAL'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Optimal ({optimalCount})
                </button>
              </div>
            )}

            {picWorkload.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Belum ada anggota tim.</p>
            ) : filteredPicWorkload.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                Tidak ada anggota tim dengan kriteria beban ini.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {displayedPicWorkload.map((w) => {
                  const pct = (n: number) => (w.total > 0 ? Math.round((n / w.total) * 100) : 0)
                  const isHigh = (w.overdue >= 1 && w.total >= 6) || w.total >= 8
                  const chip = isHigh ? (
                    <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 dark:border dark:border-orange-800/40 text-xs font-bold inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Beban Tinggi ({w.total} AP)
                    </span>
                  ) : w.review > 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border dark:border-indigo-800/40 text-xs font-medium">
                      {w.review} Review ({w.total} AP)
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/40 text-xs font-medium">
                      Optimal ({w.total} AP)
                    </span>
                  )
                  return (
                    <div key={w.picId} className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {initials(w.picName)}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{w.picName}</span>
                          {chip}
                        </div>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">
                          {w.overdue} Terlambat · {w.active + w.review} Aktif · {w.done} Selesai
                        </span>
                      </div>
                      <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded flex overflow-hidden">
                        <div className="bg-orange-500 h-full" style={{ width: `${pct(w.overdue)}%` }} />
                        <div className="bg-indigo-500 h-full" style={{ width: `${pct(w.review)}%` }} />
                        <div className="bg-blue-500 h-full" style={{ width: `${pct(w.active)}%` }} />
                        <div className="bg-emerald-500 h-full" style={{ width: `${pct(w.done)}%` }} />
                      </div>
                    </div>
                  )
                })}

                {filteredPicWorkload.length > 5 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setWorkloadExpanded(!workloadExpanded)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
                    >
                      <span>
                        {workloadExpanded
                          ? 'Tampilkan Lebih Ringkas (5 Teratas)'
                          : `Lihat Semua (${filteredPicWorkload.length} Anggota)`}
                      </span>
                      {workloadExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-5 w-full min-w-0">
          <PriorityRiskMatrix
            priorityBreakdown={priorityBreakdown}
            total={metrics.total}
            overdueCount={metrics.overdue}
          />
        </div>
      </div>

      {/* Analisis Proyek Kontributor */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 w-full min-w-0">
        <ContributorAnalysisSection />
      </div>

      {/* TIER 3: CRITICAL OVERDUE DRILL-DOWN */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Daftar Rencana Aksi Lewat Tenggat
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-mono text-xs font-bold">
                  {overdueList.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {overdueList.length === 0
                  ? 'Semua rencana aksi berjalan sesuai jadwal'
                  : `Menampilkan ${overdueShown.length} dari ${overdueMore ? '100+' : overdueList.length} tugas yang membutuhkan eskalasi segera`}
              </p>
            </div>
          </div>
          {overdueList.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Urutkan:</span>
              <select
                value={overdueSort}
                onChange={(e) => setOverdueSort(e.target.value as OverdueSort)}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {overdueList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" aria-hidden="true" />
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {hasPicFilter
                ? `${selectedPicName ?? 'PIC ini'} tidak punya rencana aksi yang lewat tenggat.`
                : 'Tidak ada action plan yang melewati tenggat. Semua berjalan tepat waktu.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 -mx-5 sm:-mx-6 px-5 sm:px-6">
            {overdueShown.map((row) => (
              <div
                key={row.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 -mx-5 sm:-mx-6 px-5 sm:px-6 transition-colors min-w-0"
              >
                {/* Bagian Kiri: Kode Ref + Judul + Metadata */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="shrink-0 font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40">
                      {row.refCode}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {row.title}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${RISK_STYLE[row.risk]}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[row.risk]}`} />
                      {RISK_LABEL[row.risk]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {row.subtitle && (
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {row.subtitle}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[8px] font-bold flex items-center justify-center shrink-0">
                        {initials(row.picName)}
                      </span>
                      <span>PIC: <strong>{row.picName}</strong></span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>Target: {fmtDate(row.deadline)}</span>
                    </span>
                  </div>
                </div>

                {/* Bagian Kanan: Badge Keterlambatan + Tombol Aksi */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/50 dark:border dark:border-orange-800/40 px-2.5 py-1 rounded-lg shrink-0">
                      Terlambat {row.lateDays} Hari
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <RemindButton state={remindState[row.id]} onClick={() => void handleRemind(row.id)} />
                    <button
                      type="button"
                      onClick={() => handleOpenAPDetail(row.id)}
                      className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white shadow-xs shrink-0`}
                    >
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
      )}

      {/* Drawer preview proposal — Radix Portal agar tidak tertabrak sticky header */}
      <DialogPrimitive.Root open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px]" />
          <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[500px] flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right">
            {preview && (
              <>
                {/* Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                      #{preview.refCode}
                    </span>
                    <DialogPrimitive.Close
                      aria-label="Tutup"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </DialogPrimitive.Close>
                  </div>
                  <div className="mt-2 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-50">
                        {preview.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={preview.status}
                          styleMap={PROPOSAL_STATUS_STYLE}
                          labelMap={PROPOSAL_STATUS_LABEL}
                        />
                        {preview.createdAt && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Diajukan {fmtDate(preview.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                  {/* Pengusul info card */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Pengusul Inisiatif
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {preview.picName}
                    </p>
                  </div>

                  {/* Deskripsi */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Deskripsi Proposal
                    </h3>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {preview.description?.trim() || 'Tidak ada deskripsi rinci.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
                  <DialogPrimitive.Close
                    className="inline-flex h-9 items-center rounded-md border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Tutup
                  </DialogPrimitive.Close>
                  <Link
                    href="/proposals"
                    onClick={() => setPreview(null)}
                    className="inline-flex h-9 items-center rounded-md bg-blue-500 hover:bg-blue-600 px-4 text-sm font-semibold text-white transition-colors shadow-sm"
                  >
                    Buka Halaman Proposal
                  </Link>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Drawer Detail Action Plan */}
      {selectedAP && (
        <ActionPlanDetail
          actionPlan={selectedAP}
          role={data.user.role}
          userId={data.user.id}
          onOpenChange={(open) => {
            if (!open) setSelectedAP(null)
          }}
          onChanged={() => {
            void fetchData(range, picFilter, false)
            fetch(`/api/action-plans/${selectedAP.id}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((ap) => {
                if (ap) setSelectedAP(ap)
              })
          }}
          onEdit={() => {
            window.location.href = `/action-plans?open=${selectedAP.id}&highlight=${selectedAP.id}`
          }}
        />
      )}
    </div>
  )
}