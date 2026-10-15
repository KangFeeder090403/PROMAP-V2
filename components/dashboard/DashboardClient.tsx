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
  Clock,
  FileText,
  FolderKanban,
  Gavel,
  Loader2,
  Lock,
  Paperclip,
  PlayCircle,
  SlidersHorizontal,
  User,
  Users,
  X,
} from 'lucide-react'
import { FilterPopover } from '@/components/ui/FilterPopover'
import { ActiveChip } from '@/components/ui/FilterToolbar'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterEmptyState } from '@/components/ui/FilterEmptyState'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DonutChart } from '@/components/charts/DonutChart'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { PortfolioSection } from '@/components/dashboard/PortfolioSection'
import { PriorityRiskMatrix } from '@/components/dashboard/PriorityRiskMatrix'
import { ContributorAnalysisSection } from '@/components/dashboard/ContributorAnalysisSection'
import { TrackerTable } from '@/components/dashboard/TrackerTable'
import { MiniTimeline } from '@/components/dashboard/MiniTimeline'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  AP_STATUS_STYLE,
  AP_STATUS_LABEL,
  AP_STATUS_DOT,
  AP_PRIORITY_STYLE,
  PROPOSAL_STATUS_STYLE,
  PROPOSAL_STATUS_LABEL,
} from '@/lib/status-labels'
import type { ActionRequiredItem, DashboardApiResponse, OverdueRow } from '@/lib/types/dashboard'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { ActionPlanDetail } from '@/components/action-plans/ActionPlanDetail'
import * as DialogPrimitive from '@radix-ui/react-dialog'

type Range = 'today' | 'week' | 'month' | 'quarter' | 'all'

/** Baris yang tampil sebelum "Lihat semua" (expand inline) di panel ringkas. */
const COMPACT_ROWS = 5

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

const AR_STATUS_OPTIONS = [
  { value: 'PENDING_APPROVAL', label: 'Menunggu Review' },
  { value: 'EVIDENCE_REQUIRED', label: 'Perlu Bukti' },
  { value: 'SUBMITTED', label: 'Proposal Diajukan' },
]

const AR_TYPE_OPTIONS = [
  { value: 'AP', label: 'Action Plan' },
  { value: 'PROPOSAL', label: 'Usulan Ide (Proposal)' },
]

/** Role yang melihat panel tim (pola sama dengan gate Analisis Kontributor). */
const MANAGER_PLUS = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER']

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
/** Risiko overdue diturunkan dari prioritas — pakai peta warna prioritas yang sama. */
const RISK_STYLE = {
  CRITICAL: AP_PRIORITY_STYLE.HIGH,
  HIGH: AP_PRIORITY_STYLE.MEDIUM,
  MEDIUM: AP_PRIORITY_STYLE.LOW,
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

const cardBase = 'bg-card rounded-lg border border-border shadow-sm dark:shadow-none w-full min-w-0'

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
      <button disabled className={`${btnBase} bg-muted text-muted-foreground cursor-wait shrink-0`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        <span>Mengirim…</span>
      </button>
    )
  }
  if (state === 'sent') {
    return (
      <span className={`${btnBase} ${AP_STATUS_STYLE.COMPLETE} shrink-0`}>
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Terkirim</span>
      </span>
    )
  }
  if (state === 'limited') {
    return (
      <span
        title="Pengingat sudah dikirim dalam 24 jam terakhir"
        className={`${btnBase} ${AP_STATUS_STYLE.EVIDENCE_REQUIRED} shrink-0`}
      >
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Sudah diingatkan</span>
      </span>
    )
  }
  return (
    <button
      onClick={onClick}
      title="Kirim pengingat ke PIC"
      className={`${btnBase} shrink-0 ${
        state === 'error'
          ? 'bg-destructive/10 text-destructive-text hover:bg-destructive/15'
          : 'bg-muted text-fg-secondary hover:bg-accent hover:text-foreground'
      }`}
    >
      <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{state === 'error' ? 'Gagal' : 'Ingatkan'}</span>
    </button>
  )
}

/** Toggle "Lihat semua" inline — ActionPlansClient tidak membaca query status, jadi bukan link. */
function ExpandToggle({
  expanded,
  total,
  onToggle,
}: {
  expanded: boolean
  total: number
  onToggle: () => void
}) {
  if (total <= COMPACT_ROWS) return null
  return (
    <div className="pt-2 text-center">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? `Ringkas (${COMPACT_ROWS} teratas)` : `Lihat semua (${total})`}
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

/** Section lipat — konten di-mount saat pertama dibuka (hemat fetch & render). */
function Collapsible({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string
  subtitle: string
  icon: typeof Users
  children: React.ReactNode
}) {
  const [opened, setOpened] = useState(false)
  return (
    <details
      className="group xl:col-span-12 w-full min-w-0"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) setOpened(true)
      }}
    >
      <summary
        className={`${cardBase} flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden`}
      >
        <Icon className="h-4 w-4 text-fg-secondary shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>
        </span>
        <ChevronDown
          className="ml-auto h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      {opened && <div className="mt-4 w-full min-w-0">{children}</div>}
    </details>
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
  const [overdueExpanded, setOverdueExpanded] = useState(false)
  const [preview, setPreview] = useState<ActionRequiredItem | null>(null)
  const [remindState, setRemindState] = useState<RemindState>({})
  const [selectedAP, setSelectedAP] = useState<ActionPlan | null>(null)
  const [arFilterOpen, setArFilterOpen] = useState(false)
  const [arTypeFilter, setArTypeFilter] = useState('')
  const [arStatusFilters, setArStatusFilters] = useState<string[]>([])
  const [arExpanded, setArExpanded] = useState(false)
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
      if (res.status === 401 || res.status === 403) {
        if (reqRef.current === reqId) setError('FORBIDDEN')
        return
      }
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

  if (error === 'FORBIDDEN') {
    return (
      <div className={`${cardBase} p-10 text-center`}>
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Anda tidak punya akses</h2>
        <p className="mt-1 text-sm text-muted-foreground">Masuk ulang atau hubungi admin perusahaan Anda.</p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors"
        >
          Masuk ulang
        </Link>
      </div>
    )
  }

  if (!data && error) {
    return (
      <div className={`${cardBase} p-5`}>
        <p className="text-sm text-fg-secondary">{error}</p>
        <button
          onClick={() => void fetchData(range, picFilter, true)}
          className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (!data) return <DashboardSkeleton />

  const { user, metrics, statusBreakdown, priorityBreakdown, picWorkload, actionRequired, overdueList } = data
  const tracker = data.tracker ?? []
  const isPic = user.role === 'PIC' || user.roleLabel === 'PIC'
  const isManagerPlus = MANAGER_PLUS.includes(user.role)
  // GUEST = persona demo Manager (data dummy) — ikut lihat Beban Kerja Tim.
  const showWorkload = isManagerPlus || user.role === 'GUEST'
  const hasPicFilter = picFilter !== ''
  const selectedPicName = picOptions.find((p) => p.id === picFilter)?.name ?? null
  const isEmpty = metrics.total === 0 && actionRequired.length === 0

  const arFiltered = arTypeFilter !== '' || arStatusFilters.length > 0
  const filteredActionRequired = actionRequired.filter((item) => {
    if (arTypeFilter && item.kind !== arTypeFilter) return false
    if (arStatusFilters.length > 0 && !arStatusFilters.includes(item.status)) return false
    return true
  })
  const arShown = arExpanded ? filteredActionRequired : filteredActionRequired.slice(0, COMPACT_ROWS)
  const resetArFilter = () => {
    setArTypeFilter('')
    setArStatusFilters([])
  }

  // Overdue disortir di client (keputusan PO 2026-09-09).
  const overdueSorted = sortOverdue(overdueList, overdueSort)
  const overdueShown = overdueExpanded ? overdueSorted : overdueSorted.slice(0, COMPACT_ROWS)
  // API mengirim maksimal OVERDUE_CANDIDATES; kalau penuh, total sebenarnya bisa lebih.
  const overdueMore = overdueList.length >= 100

  const isHighLoad = (w: (typeof picWorkload)[number]) => (w.overdue >= 1 && w.total >= 6) || w.total >= 8
  const workloadCounts = {
    ALL: picWorkload.length,
    HIGH: picWorkload.filter(isHighLoad).length,
    OVERDUE: picWorkload.filter((w) => w.overdue > 0).length,
    OPTIMAL: picWorkload.filter((w) => w.overdue === 0).length,
  }
  const filteredPicWorkload = picWorkload.filter((w) => {
    if (workloadFilter === 'HIGH') return isHighLoad(w)
    if (workloadFilter === 'OVERDUE') return w.overdue > 0
    if (workloadFilter === 'OPTIMAL') return w.overdue === 0
    return true
  })
  const displayedPicWorkload = workloadExpanded ? filteredPicWorkload : filteredPicWorkload.slice(0, COMPACT_ROWS)

  const subtitleBits = [
    user.divisionName ? `Divisi ${user.divisionName}` : null,
    user.companyName ?? null,
  ].filter(Boolean)

  // Ringkasan satu kalimat — prioritas: masalah dulu.
  const headline =
    metrics.total === 0
      ? 'Belum ada rencana aksi pada rentang ini.'
      : metrics.overdue > 0
        ? `${metrics.overdue} rencana aksi lewat tenggat dan ${actionRequired.length} menunggu keputusan Anda.`
        : actionRequired.length > 0
          ? `${actionRequired.length} item menunggu keputusan Anda. Tidak ada yang lewat tenggat.`
          : `Semua ${metrics.total} rencana aksi berjalan sesuai jadwal.`

  const onTime = metrics.onTimeRate ?? null
  const basis = metrics.onTimeBasis

  return (
    <div
      className={`grid grid-cols-1 xl:grid-cols-12 gap-4 w-full min-w-0 transition-opacity duration-200 ${
        switching ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {/* Header strip: salam, ringkasan, filter PIC, rentang */}
      <div className={`${cardBase} order-first xl:order-none xl:col-span-12 p-4 sm:p-5 space-y-3`}>
        {error && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
            <p className="text-sm text-destructive-text">{error}</p>
            <button
              onClick={() => void fetchData(range, picFilter, false)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium transition-colors"
            >
              Coba lagi
            </button>
          </div>
        )}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="block text-xs font-medium text-muted-foreground truncate">
              {subtitleBits.join(' · ') || user.roleLabel}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {data.greeting}, {user.name}
            </h1>
            <p className="text-sm text-fg-secondary max-w-3xl">{headline}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
            {!isPic && (
              <select
                value={picFilter}
                onChange={(e) => handlePicChange(e.target.value)}
                disabled={switching}
                aria-label="Filter berdasarkan PIC"
                className="h-9 rounded-md border border-input bg-background px-2 text-xs font-medium text-fg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
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
              className="flex-1 min-w-0 lg:flex-none flex items-center gap-1 bg-muted p-1 rounded-lg overflow-x-auto whitespace-nowrap"
              aria-busy={switching}
            >
              {RANGE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleRangeChange(tab.key)}
                  disabled={switching}
                  aria-current={range === tab.key ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:cursor-not-allowed ${
                    range === tab.key ? 'bg-card text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {switching && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Memuat…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 6 KPI */}
      <div className="order-first xl:order-none xl:col-span-12 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 min-w-0">
        <MetricCard
          label="Total"
          value={metrics.total}
          icon={ClipboardList}
          iconClass="bg-muted text-fg-secondary"
          footer="Rencana aksi pada rentang ini"
        />
        <MetricCard
          label="Selesai"
          value={`${Math.round(metrics.completionRate)}%`}
          icon={CheckCircle2}
          iconClass="bg-muted text-fg-secondary"
          progress={metrics.completionRate}
          progressClass="bg-primary"
          footer={`${metrics.complete} dari ${metrics.total} tuntas`}
        />
        <MetricCard
          label="Tepat Waktu"
          value={onTime === null ? '—' : `${Math.round(onTime)}%`}
          icon={Clock}
          iconClass="bg-muted text-fg-secondary"
          footer={
            !basis || basis.total === 0 ? (
              'Belum ada AP selesai'
            ) : (
              <span
                title={`Tanggal selesai: ${basis.fromLog} dari riwayat status, ${basis.fromUpdatedAt} perkiraan dari pembaruan terakhir`}
              >
                Dari {basis.total} AP selesai{basis.fromUpdatedAt > 0 ? ` · ${basis.fromUpdatedAt} perkiraan` : ''}
              </span>
            )
          }
        />
        <MetricCard
          label="Berjalan"
          value={metrics.inProgress}
          icon={PlayCircle}
          iconClass="bg-muted text-fg-secondary"
          footer="Status Dikerjakan"
        />
        <MetricCard
          label="Review"
          value={metrics.inReview}
          icon={Gavel}
          iconClass="bg-muted text-fg-secondary"
          footer="Menunggu review + perlu bukti"
        />
        <MetricCard
          label="Lewat Tenggat"
          value={metrics.overdue}
          valueClass={metrics.overdue > 0 ? 'text-destructive-text' : undefined}
          icon={AlertTriangle}
          iconClass={metrics.overdue > 0 ? 'bg-destructive/10 text-destructive-text' : 'bg-muted text-fg-secondary'}
          footer={metrics.overdue > 0 ? 'Perlu tindakan segera' : 'Semua terkendali'}
        />
      </div>

      {isEmpty ? (
        <div className="xl:col-span-12 min-w-0">
          {hasPicFilter ? (
            <div className={cardBase}>
              <FilterEmptyState
                title="Tidak ada hasil"
                description={`${selectedPicName ?? 'PIC ini'} tidak punya rencana aksi pada rentang ini.`}
                onReset={() => handlePicChange('')}
              />
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada rencana aksi"
              description="Buat rencana aksi pertama untuk mulai memantau progres tim di sini."
              action={{ label: 'Buka Action Plans', href: '/action-plans' }}
            />
          )}
        </div>
      ) : (
        <>
          {/* Sebaran status */}
          <div className={`${cardBase} xl:col-span-6 2xl:col-span-3 p-4 sm:p-5`}>
            <h2 className="text-sm font-semibold text-foreground">Sebaran Status</h2>
            <p className="text-xs text-muted-foreground mb-4">{metrics.total} rencana aksi pada rentang ini</p>
            <DonutChart data={statusBreakdown} center={{ value: metrics.total, label: 'Total AP' }} />
          </div>

          <div className="xl:col-span-6 2xl:col-span-3 min-w-0">
            <PriorityRiskMatrix
              priorityBreakdown={priorityBreakdown}
              total={metrics.total}
              overdueCount={metrics.overdue}
            />
          </div>

          {/* Menunggu Keputusan */}
          <div className={`${cardBase} -order-1 xl:order-none xl:col-span-12 2xl:col-span-6 p-4 sm:p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-border">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <Gavel className="w-4 h-4 text-fg-secondary shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Menunggu Keputusan Anda</h2>
                <span className="px-2 py-0.5 rounded-sm bg-muted text-fg-secondary text-xs font-semibold tabular-nums">
                  {filteredActionRequired.length}
                  {filteredActionRequired.length !== actionRequired.length ? ` dari ${actionRequired.length}` : ''}
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setArFilterOpen((v) => !v)}
                  aria-expanded={arFilterOpen}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-semibold transition-colors ${
                    arFilterOpen || arFiltered
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-fg-secondary hover:bg-accent'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Filter</span>
                  {arFiltered && (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground px-1 text-[10px] font-bold">
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
                  initialValues={{ statuses: arStatusFilters, customType: arTypeFilter }}
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

            {arFiltered && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {arTypeFilter && (
                  <ActiveChip
                    label={`Tipe: ${AR_TYPE_OPTIONS.find((t) => t.value === arTypeFilter)?.label ?? arTypeFilter}`}
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
                  onClick={resetArFilter}
                  className="text-xs font-semibold text-destructive-text hover:underline underline-offset-2 ml-1"
                >
                  Hapus filter
                </button>
              </div>
            )}

            {filteredActionRequired.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {arFiltered
                    ? 'Tidak ada hasil untuk filter ini.'
                    : 'Semua sudah beres — tidak ada item yang menunggu.'}
                </p>
                {arFiltered && (
                  <button
                    type="button"
                    onClick={resetArFilter}
                    className="mt-3 inline-flex items-center h-8 px-3 rounded-md border border-input bg-background text-xs font-medium text-fg-secondary hover:bg-accent transition-colors"
                  >
                    Reset filter
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {arShown.map((item) => {
                  const isAP = item.kind === 'AP'
                  const isApproval = isAP && item.status === 'PENDING_APPROVAL'
                  const open = () => (isAP ? void handleOpenAPDetail(item.id) : setPreview(item))
                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          open()
                        }
                      }}
                      className="p-3 rounded-lg border border-border hover:bg-accent transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="p-1.5 rounded-md bg-muted text-fg-secondary shrink-0 mt-0.5">
                          {isAP ? (
                            isApproval ? (
                              <PlayCircle className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                            )
                          ) : (
                            <FileText className="w-4 h-4" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-semibold text-fg-secondary">#{item.refCode}</span>
                            <span className="text-sm font-medium text-foreground truncate max-w-xs">{item.title}</span>
                            <StatusBadge
                              status={item.status}
                              styleMap={isAP ? AP_STATUS_STYLE : PROPOSAL_STATUS_STYLE}
                              labelMap={isAP ? AP_STATUS_LABEL : PROPOSAL_STATUS_LABEL}
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" aria-hidden="true" />
                              {isAP ? 'PIC: ' : 'Pengusul: '}
                              <strong className="font-medium text-fg-secondary">{item.picName}</strong>
                            </span>
                            {isAP && item.deadline && (
                              <span className="font-mono">Deadline: {fmtDate(item.deadline)}</span>
                            )}
                            {!isAP && item.createdAt && (
                              <span className="font-mono">Diajukan: {fmtDate(item.createdAt)}</span>
                            )}
                            {item.evidenceLink && (
                              <span className="inline-flex items-center gap-1 text-fg-secondary">
                                <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                                <span className="truncate max-w-[180px]">{item.evidenceLink}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0">
                        {isAP && isApproval &&
                          (isPic ? (
                            <span className="flex items-center text-xs text-muted-foreground font-medium">
                              Menunggu Review <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleOpenAPDetail(item.id)
                              }}
                              className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary-hover font-semibold`}
                            >
                              Review Bukti
                            </button>
                          ))}
                        {isAP && !isApproval &&
                          (isPic ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleOpenAPDetail(item.id)
                              }}
                              className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary-hover font-semibold`}
                            >
                              {item.status === 'REJECTED' ? 'Perbaiki' : 'Unggah Bukti'}
                            </button>
                          ) : (
                            <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                              <RemindButton state={remindState[item.id]} onClick={() => void handleRemind(item.id)} />
                            </span>
                          ))}
                        {!isAP &&
                          (isPic ? (
                            <span className="flex items-center text-xs text-muted-foreground font-medium">
                              Menunggu Approval <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPreview(item)
                              }}
                              className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary-hover font-semibold`}
                            >
                              Review Proposal
                            </button>
                          ))}
                      </div>
                    </div>
                  )
                })}
                <ExpandToggle
                  expanded={arExpanded}
                  total={filteredActionRequired.length}
                  onToggle={() => setArExpanded((v) => !v)}
                />
              </div>
            )}
          </div>

          {/* Tracker + Beban Kerja Tim */}
          <div className={`min-w-0 ${showWorkload ? 'xl:col-span-8' : 'xl:col-span-12'}`}>
            <TrackerTable rows={tracker} onOpen={(id) => void handleOpenAPDetail(id)} />
          </div>

          {showWorkload && (
            <div className={`${cardBase} xl:col-span-4 p-4 sm:p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-fg-secondary shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Beban Kerja Tim</h2>
                <span className="ml-auto text-xs font-mono text-muted-foreground">{picWorkload.length} anggota</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-3">
                {(
                  [
                    ['OVERDUE', 'Terlambat'],
                    ['PENDING_APPROVAL', 'Review'],
                    ['IN_PROGRESS', 'Dikerjakan'],
                    ['COMPLETE', 'Selesai'],
                  ] as const
                ).map(([s, l]) => (
                  <span key={s} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-sm ${AP_STATUS_DOT[s]}`} aria-hidden="true" /> {l}
                  </span>
                ))}
              </div>

              {picWorkload.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filter beban kerja">
                  {(
                    [
                      ['ALL', 'Semua'],
                      ['HIGH', 'Beban Tinggi'],
                      ['OVERDUE', 'Ada Terlambat'],
                      ['OPTIMAL', 'Optimal'],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={workloadFilter === k}
                      onClick={() => setWorkloadFilter(k)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        workloadFilter === k
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-fg-secondary hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {l} ({workloadCounts[k]})
                    </button>
                  ))}
                </div>
              )}

              {picWorkload.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Belum ada anggota tim dengan rencana aksi.</p>
              ) : filteredPicWorkload.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">Tidak ada hasil untuk kriteria ini.</p>
                  <button
                    type="button"
                    onClick={() => setWorkloadFilter('ALL')}
                    className="mt-2 inline-flex items-center h-8 px-3 rounded-md border border-input bg-background text-xs font-medium text-fg-secondary hover:bg-accent transition-colors"
                  >
                    Reset filter
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayedPicWorkload.map((w) => {
                    const pct = (n: number) => (w.total > 0 ? Math.round((n / w.total) * 100) : 0)
                    return (
                      <div key={w.picId} className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-muted text-fg-secondary text-[10px] font-bold flex items-center justify-center shrink-0">
                              {initials(w.picName)}
                            </span>
                            <span className="text-sm font-medium text-foreground truncate">{w.picName}</span>
                            {isHighLoad(w) && (
                              <AlertTriangle
                                className="w-3.5 h-3.5 text-destructive-text shrink-0"
                                aria-label="Beban tinggi"
                              />
                            )}
                          </div>
                          <span className="font-mono text-xs text-muted-foreground shrink-0">{w.total} AP</span>
                        </div>
                        <div
                          className="h-2.5 w-full bg-muted rounded-sm flex overflow-hidden"
                          title={`${w.overdue} terlambat · ${w.review} review · ${w.active} dikerjakan · ${w.done} selesai`}
                        >
                          <div className={AP_STATUS_DOT.OVERDUE} style={{ width: `${pct(w.overdue)}%` }} />
                          <div className={AP_STATUS_DOT.PENDING_APPROVAL} style={{ width: `${pct(w.review)}%` }} />
                          <div className={AP_STATUS_DOT.IN_PROGRESS} style={{ width: `${pct(w.active)}%` }} />
                          <div className={AP_STATUS_DOT.COMPLETE} style={{ width: `${pct(w.done)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  <ExpandToggle
                    expanded={workloadExpanded}
                    total={filteredPicWorkload.length}
                    onToggle={() => setWorkloadExpanded((v) => !v)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Linimasa 14 hari + Lewat Tenggat */}
          <div className="xl:col-span-8 min-w-0">
            <MiniTimeline
              rows={tracker}
              milestones={data.portfolio?.upcomingMilestones}
              onOpen={(id) => void handleOpenAPDetail(id)}
            />
          </div>

          <div className={`${cardBase} -order-1 xl:order-none xl:col-span-4 p-4 sm:p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-destructive-text shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Lewat Tenggat</h2>
                <span className="px-1.5 py-0.5 rounded-sm bg-muted text-fg-secondary font-mono text-xs font-semibold">
                  {overdueMore ? '100+' : overdueList.length}
                </span>
              </div>
              {overdueList.length > 1 && (
                <select
                  value={overdueSort}
                  onChange={(e) => setOverdueSort(e.target.value as OverdueSort)}
                  aria-label="Urutkan daftar lewat tenggat"
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-fg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {overdueList.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-fg-secondary">
                  {hasPicFilter
                    ? `${selectedPicName ?? 'PIC ini'} tidak punya rencana aksi yang lewat tenggat.`
                    : 'Tidak ada yang lewat tenggat.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border border-t border-border">
                {overdueShown.map((row) => (
                  <div key={row.id} className="py-3 flex flex-col gap-2 min-w-0">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => void handleOpenAPDetail(row.id)}
                        className="block w-full text-left text-sm font-medium text-foreground truncate hover:underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {row.title}
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono">{row.refCode}</span>
                        <span className="truncate">PIC: {row.picName}</span>
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" aria-hidden="true" />
                          {fmtDate(row.deadline)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-sm text-[11px] font-semibold ${RISK_STYLE[row.risk]}`}>
                        Risiko {RISK_LABEL[row.risk]}
                      </span>
                      <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-sm ${AP_STATUS_STYLE.OVERDUE}`}>
                        +{row.lateDays} hari
                      </span>
                      <span className="ml-auto">
                        <RemindButton state={remindState[row.id]} onClick={() => void handleRemind(row.id)} />
                      </span>
                    </div>
                  </div>
                ))}
                <ExpandToggle
                  expanded={overdueExpanded}
                  total={overdueSorted.length}
                  onToggle={() => setOverdueExpanded((v) => !v)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail lanjutan. Portofolio: Manager+ & GUEST (demo). Kontributor: Manager+ saja (API menolak GUEST). */}
      {showWorkload && data.portfolio && (
        <Collapsible
          title="Portofolio Proyek"
          subtitle="Linimasa proyek dan kinerja per divisi"
          icon={FolderKanban}
        >
          <PortfolioSection portfolio={data.portfolio} userRole={user.role} />
        </Collapsible>
      )}
      {isManagerPlus && (
        <Collapsible
          title="Analisis Kontributor"
          subtitle="Capaian kerja per kontributor berdasarkan proyek"
          icon={Users}
        >
          <div className={`${cardBase} p-4 sm:p-5`}>
            <ContributorAnalysisSection />
          </div>
        </Collapsible>
      )}

      {/* Drawer preview proposal — Radix Portal agar tidak tertabrak sticky header */}
      <DialogPrimitive.Root open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
          <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[500px] flex-col border-l border-border bg-card shadow-md outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right">
            {preview && (
              <>
                <div className="border-b border-border px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-semibold text-fg-secondary">#{preview.refCode}</span>
                    <DialogPrimitive.Close
                      aria-label="Tutup"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </DialogPrimitive.Close>
                  </div>
                  <DialogPrimitive.Title className="mt-2 text-base font-semibold leading-snug text-foreground">
                    {preview.title}
                  </DialogPrimitive.Title>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={preview.status} styleMap={PROPOSAL_STATUS_STYLE} labelMap={PROPOSAL_STATUS_LABEL} />
                    {preview.createdAt && (
                      <span className="text-xs text-muted-foreground">Diajukan {fmtDate(preview.createdAt)}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                  <div className="rounded-lg border border-border p-4 bg-muted">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pengusul Inisiatif</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{preview.picName}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deskripsi Proposal</h3>
                    <div className="rounded-lg border border-border p-4 bg-card">
                      <DialogPrimitive.Description className="text-sm text-fg-secondary whitespace-pre-wrap leading-relaxed">
                        {preview.description?.trim() || 'Tidak ada deskripsi rinci.'}
                      </DialogPrimitive.Description>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
                  <DialogPrimitive.Close className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-fg-secondary transition-colors hover:bg-accent">
                    Tutup
                  </DialogPrimitive.Close>
                  <Link
                    href="/proposals"
                    onClick={() => setPreview(null)}
                    className="inline-flex h-9 items-center rounded-md bg-primary hover:bg-primary-hover px-4 text-sm font-semibold text-primary-foreground transition-colors"
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
