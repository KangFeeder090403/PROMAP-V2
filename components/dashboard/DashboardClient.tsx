'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Gavel,
  Loader2,
  Paperclip,
  PlayCircle,
  User,
  X,
} from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DonutChart } from '@/components/charts/DonutChart'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { PortfolioSection } from '@/components/dashboard/PortfolioSection'
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

  // Overdue disortir di client (keputusan PO 2026-09-09) lalu dipotong 10 teratas.
  const overdueSorted = sortOverdue(overdueList, overdueSort)
  const overdueShown = overdueSorted.slice(0, OVERDUE_VISIBLE)
  // API mengirim maksimal OVERDUE_CANDIDATES; kalau penuh, total sebenarnya bisa lebih.
  const overdueMore = overdueList.length >= 100

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
      {/* Contextual Banner & Time Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            {data.greeting}, {user.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {subtitleBits.join(' · ') || user.roleLabel}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{headline}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
          {!isPic && (
            <select
              value={picFilter}
              onChange={(e) => handlePicChange(e.target.value)}
              disabled={switching}
              aria-label="Filter berdasarkan PIC"
              className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
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
            className="flex-1 min-w-0 lg:flex-none flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto whitespace-nowrap"
            aria-busy={switching}
          >
            {RANGE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleRangeChange(tab.key)}
                disabled={switching}
                aria-current={range === tab.key ? 'page' : undefined}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all disabled:cursor-not-allowed ${
                  range === tab.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-semibold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
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

      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Rencana Aksi"
          value={metrics.total}
          icon={ClipboardList}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
          footer="Semua rencana aksi pada rentang ini"
        />
        <MetricCard
          label="Selesai"
          value={metrics.complete}
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
          badge={
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 dark:border dark:border-emerald-800/40 px-2 py-0.5 rounded">
              {Math.round(metrics.completionRate)}%
            </span>
          }
          progress={metrics.completionRate}
        />
        <MetricCard
          label="Sedang Dikerjakan"
          value={metrics.inProgress}
          icon={PlayCircle}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
          footer={
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-600 dark:text-blue-400">{metrics.inReview}</span>{' '}
              di antaranya menunggu persetujuan
            </p>
          }
        />
        <MetricCard
          label="Lewat Tenggat"
          value={metrics.overdue}
          valueClass="text-orange-600 dark:text-orange-400"
          icon={AlertTriangle}
          iconClass="bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300"
          badge={
            metrics.overdue > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 dark:bg-orange-950/60 dark:border dark:border-orange-800/40 text-orange-700 dark:text-orange-300 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                Perlu ditindak
              </span>
            ) : undefined
          }
          footer={
            overdueList.length > 0
              ? `Terlama: ${overdueList[0].title} (${overdueList[0].lateDays} hari)`
              : 'Tidak ada yang lewat tenggat'
          }
        />
      </div>

      {/* Action Required */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 flex items-center justify-center">
              <Gavel className="w-5 h-5" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Menunggu Keputusan Anda</h2>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-semibold">
              {actionRequired.length} item
            </span>
          </div>
        </div>

        {actionRequired.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            Semua sudah beres — tidak ada item yang menunggu.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {actionRequired.map((item) => {
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

      {/* Charts: Status Distribution + Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Sebaran Status</h3>
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
          <div className="mt-4 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sudah selesai</span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {metrics.complete} dari {metrics.total} ({Math.round(metrics.completionRate)}%)
            </span>
          </div>
        </div>

        {SHOW_TEAM_WORKLOAD ? (
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Beban Kerja Tim</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Jumlah rencana aksi per orang</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
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

          {picWorkload.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Belum ada anggota tim.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {picWorkload.map((w) => {
                const pct = (n: number) => (w.total > 0 ? Math.round((n / w.total) * 100) : 0)
                const isHigh = w.overdue >= 1 && w.total >= 6
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
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span>Orang dengan batang oranye terpanjang paling butuh bantuan.</span>
            <Link href="/board" className="font-medium text-blue-600 hover:underline dark:text-blue-400 shrink-0">
              Atur ulang tugas →
            </Link>
          </div>
        </div>
        ) : (
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <div className="pb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Distribusi Prioritas</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Tingkat urgensi seluruh rencana aksi pada rentang ini
            </span>
          </div>
          {metrics.total === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              Belum ada rencana aksi untuk dinilai prioritasnya.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {priorityBreakdown.map((p) => {
                const meta = PRIORITY_META[p.priority]
                const pct = metrics.total > 0 ? Math.round((p.count / metrics.total) * 100) : 0
                return (
                  <div key={p.priority} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                        {meta.label}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {p.count} AP · {pct}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                      <div className={`h-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Helicopter view — kesehatan project, lintas divisi, radar tenggat */}
      {data.portfolio && <PortfolioSection portfolio={data.portfolio} />}

      {/* Overdue & Critical Deadlines */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Lewat Tenggat</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {overdueList.length === 0
                  ? 'Tidak ada yang lewat tenggat'
                  : `Menampilkan ${overdueShown.length} dari ${overdueMore ? '100+' : overdueList.length} teratas`}
              </span>
            </div>
          </div>
          {overdueList.length > 0 && (
            <label className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              Urutkan
              <select
                value={overdueSort}
                onChange={(e) => setOverdueSort(e.target.value as OverdueSort)}
                className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {overdueList.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            {hasPicFilter
              ? `${selectedPicName ?? 'PIC ini'} tidak punya rencana aksi yang lewat tenggat.`
              : 'Tidak ada action plan yang melewati tenggat. Mantap.'}
          </p>
        ) : (
          <div className="w-full">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-3 py-2.5 rounded-l-md font-medium">Rencana Aksi</th>
                  <th className="w-24 px-2 py-2.5 font-medium whitespace-nowrap hidden sm:table-cell">Prioritas</th>
                  <th className="w-32 px-2 py-2.5 font-medium whitespace-nowrap hidden md:table-cell">PIC</th>
                  <th className="w-24 px-2 py-2.5 font-medium whitespace-nowrap hidden lg:table-cell">Batas Waktu</th>
                  <th className="w-24 px-2 py-2.5 font-medium whitespace-nowrap">Terlambat</th>
                  <th className="w-36 px-2 py-2.5 text-right rounded-r-md font-medium whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {overdueShown.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2.5 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 shrink-0">{row.refCode}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{row.title}</span>
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {row.subtitle && (
                            <span className="truncate max-w-[200px]">{row.subtitle}</span>
                          )}
                          <span className="md:hidden text-slate-400">· {row.picName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap hidden sm:table-cell">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${RISK_STYLE[row.risk]}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${RISK_DOT[row.risk]}`} />
                        {RISK_LABEL[row.risk]}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap hidden md:table-cell min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] font-bold flex items-center justify-center shrink-0">
                          {initials(row.picName)}
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 font-medium text-xs truncate">{row.picName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap hidden lg:table-cell">
                      {fmtDate(row.deadline)}
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/50 dark:border dark:border-orange-800/40 px-2 py-0.5 rounded inline-block">
                        {row.lateDays} Hari
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <RemindButton state={remindState[row.id]} onClick={() => void handleRemind(row.id)} />
                        <Link
                          href={`/action-plans?open=${row.id}&highlight=${row.id}`}
                          onClick={(e) => {
                            e.preventDefault()
                            handleOpenAPDetail(row.id)
                          }}
                          className={`${btnBase} bg-blue-500 text-white hover:bg-blue-600 shadow-sm shrink-0`}
                        >
                          Detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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