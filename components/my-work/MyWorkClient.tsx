'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  Flame,
  Inbox,
  Layers,
  MoreVertical,
  Paperclip,
  XCircle,
  Zap,
} from 'lucide-react'
import { MyWorkSkeleton } from '@/components/my-work/MyWorkSkeleton'
import { WorkstationInspector } from '@/components/my-work/WorkstationInspector'
import { WorkstationEmptyState } from '@/components/my-work/WorkstationEmptyState'
import { ActionPlanDetail } from '@/components/action-plans/ActionPlanDetail'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_LABEL, AP_STATUS_STYLE, AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import type { MyWorkApiResponse, MyWorkItem, MyWorkProposal } from '@/lib/types/my-work'
import type { ActionPlanStatus, Priority, Role } from '@/lib/generated/prisma/client'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { timeAgo } from '@/lib/date-utils'

type Tab = 'semua' | 'aksi' | 'minggu' | 'selesai'

const TABS: { key: Tab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'aksi', label: 'Butuh Aksi Saya' },
  { key: 'minggu', label: 'Deadline Minggu Ini' },
  { key: 'selesai', label: 'Selesai' },
]

const AKSI_STATUSES: ActionPlanStatus[] = ['REJECTED', 'EVIDENCE_REQUIRED', 'OVERDUE']
const DONE_STATUSES: ActionPlanStatus[] = ['COMPLETE', 'APPROVED']
const EVIDENCE_ELIGIBLE: ActionPlanStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'EVIDENCE_REQUIRED',
  'REJECTED',
  'OVERDUE',
]

const DAY_MS = 86_400_000

function deadlineMeta(iso: string, now: Date): { label: string; cls: string } {
  const diff = new Date(iso).getTime() - now.getTime()
  const overdue = 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40'
  const soon = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
  const calm = 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'

  if (diff <= 0) {
    const days = Math.ceil(-diff / DAY_MS)
    return { label: days <= 1 ? 'Lewat Tenggat' : `Lewat ${days} Hari`, cls: overdue }
  }
  if (diff < 3_600_000) return { label: 'Kurang dari 1 Jam', cls: overdue }
  if (diff < DAY_MS) return { label: `${Math.ceil(diff / 3_600_000)} Jam Tersisa`, cls: overdue }
  const days = Math.ceil(diff / DAY_MS)
  if (days === 1) return { label: 'Besok', cls: soon }
  if (days <= 3) return { label: `${days} Hari Lagi`, cls: soon }
  return { label: `${days} Hari Lagi`, cls: calm }
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

type BannerKind = 'ap' | 'proposal'

interface BannerItem {
  id: string
  kind: BannerKind
  kindLabel: string
  refCode: string
  title: string
  desc: string
  cta: string
  href: string
  icon: React.ReactNode
}

function buildAksiItems(rows: MyWorkItem[], proposals: MyWorkProposal[], now: Date): BannerItem[] {
  const items: BannerItem[] = []

  for (const row of rows) {
    if (!AKSI_STATUSES.includes(row.status)) continue
    if (row.status === 'REJECTED') {
      items.push({
        id: row.id,
        kind: 'ap',
        kindLabel: 'Perlu Revisi',
        refCode: row.refCode,
        title: row.title,
        desc: row.reviewNote ? `Catatan reviewer: ${row.reviewNote}` : 'Revisi perbaikan dibutuhkan sebelum disubmit ulang.',
        cta: 'Perbaiki Sekarang',
        href: `/action-plans?open=${row.id}&highlight=${row.id}`,
        icon: <XCircle className="h-4 w-4 shrink-0 text-red-500" />,
      })
    } else if (row.status === 'EVIDENCE_REQUIRED') {
      items.push({
        id: row.id,
        kind: 'ap',
        kindLabel: 'Bukti Tambahan',
        refCode: row.refCode,
        title: row.title,
        desc: 'Lampirkan bukti kerja tambahan agar bisa diverifikasi reviewer.',
        cta: 'Unggah Bukti',
        href: `/action-plans?open=${row.id}&highlight=${row.id}`,
        icon: <Paperclip className="h-4 w-4 shrink-0 text-amber-500" />,
      })
    } else {
      items.push({
        id: row.id,
        kind: 'ap',
        kindLabel: 'Terlambat',
        refCode: row.refCode,
        title: row.title,
        desc: `Melewati tenggat. ${deadlineMeta(row.endDate, now).label} — segera eksekusi.`,
        cta: 'Kerjakan Sekarang',
        href: `/action-plans?open=${row.id}&highlight=${row.id}`,
        icon: <Clock className="h-4 w-4 shrink-0 text-orange-500" />,
      })
    }
  }

  for (const p of proposals) {
    items.push({
      id: p.id,
      kind: 'proposal',
      kindLabel: 'Draft',
      refCode: p.refCode,
      title: p.title,
      desc: 'Draft proposal belum dikirim ke reviewer untuk disetujui.',
      cta: 'Submit Proposal',
      href: '/proposals',
      icon: <FileText className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />,
    })
  }

  return items
}

const PRIORITY_DOT: Record<Priority, { cls: string; label: string }> = {
  HIGH: { cls: 'bg-red-500', label: 'Prioritas Tinggi' },
  MEDIUM: { cls: 'bg-amber-500', label: 'Prioritas Sedang' },
  LOW: { cls: 'bg-slate-400', label: 'Prioritas Rendah' },
}

function PriorityDot({ priority }: { priority: Priority }) {
  const p = PRIORITY_DOT[priority]
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${p.cls}`}
      title={p.label}
      aria-label={p.label}
    />
  )
}

function DeadlineChip({ iso, now }: { iso: string; now: Date }) {
  const meta = deadlineMeta(iso, now)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>
      <Clock className="h-3 w-3" aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  )
}

function computeMyWorkCounts(
  rows: MyWorkItem[],
  proposals: MyWorkProposal[]
): Record<Tab, number> {
  const aksiAp = rows.filter((r) => AKSI_STATUSES.includes(r.status)).length
  const aksiProposal = proposals.length
  const now = new Date()
  const weekLimit = new Date(now.getTime() + 7 * DAY_MS)
  const minggu = rows.filter((r) => {
    if (DONE_STATUSES.includes(r.status)) return false
    const d = new Date(r.endDate)
    return d >= now && d <= weekLimit
  }).length
  const selesai = rows.filter((r) => DONE_STATUSES.includes(r.status)).length

  return {
    semua: rows.length,
    aksi: aksiAp + aksiProposal,
    minggu,
    selesai,
  }
}

function filterMyWorkRows(
  rows: MyWorkItem[],
  tab: Tab,
  todayStart: Date
): MyWorkItem[] {
  if (tab === 'aksi') {
    return rows.filter((r) => AKSI_STATUSES.includes(r.status))
  }
  if (tab === 'minggu') {
    const limit = new Date(todayStart.getTime() + 7 * DAY_MS)
    return rows.filter((r) => {
      if (DONE_STATUSES.includes(r.status)) return false
      const d = new Date(r.endDate)
      return d >= todayStart && d <= limit
    })
  }
  if (tab === 'selesai') {
    return rows.filter((r) => DONE_STATUSES.includes(r.status))
  }
  return rows
}

function MyWorkErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/40">
      <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
      >
        Coba Lagi
      </button>
    </div>
  )
}

export function MyWorkClient() {
  const [data, setData] = useState<MyWorkApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('semua')
  const [now, setNow] = useState(() => new Date())
  const [selectedAP, setSelectedAP] = useState<ActionPlan | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [bannerCollapsed, setBannerCollapsed] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  const rows = useMemo(() => data?.actionPlans ?? [], [data])
  const proposals = useMemo(() => data?.proposals ?? [], [data])

  const counts = useMemo(() => computeMyWorkCounts(rows, proposals), [rows, proposals])
  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [now])

  const aksiItems = useMemo(() => buildAksiItems(rows, proposals, now), [rows, proposals, now])

  const completeCount = useMemo(() => rows.filter((r) => DONE_STATUSES.includes(r.status)).length, [rows])
  const pct = rows.length > 0 ? Math.round((completeCount / rows.length) * 100) : 0

  const evidenceScope = useMemo(() => rows.filter((r) => EVIDENCE_ELIGIBLE.includes(r.status)), [rows])
  const withEvidence = useMemo(() => evidenceScope.filter((r) => Boolean(r.evidenceLink)), [evidenceScope])
  const evidenceTotal = evidenceScope.length
  const evidencePct = evidenceTotal > 0 ? Math.round((withEvidence.length / evidenceTotal) * 100) : 0

  const filteredRows = useMemo(() => filterMyWorkRows(rows, tab, todayStart), [rows, tab, todayStart])

  // Pengelompokan Berdasar Horizon Waktu (Linear/ClickUp Workstation Model)
  const { horizonUrgent, horizonThisWeek, horizonLaterDone } = useMemo(() => {
    const urgent: MyWorkItem[] = []
    const thisWeek: MyWorkItem[] = []
    const laterDone: MyWorkItem[] = []

    const weekLimit = new Date(now.getTime() + 7 * DAY_MS)

    for (const r of filteredRows) {
      if (DONE_STATUSES.includes(r.status)) {
        laterDone.push(r)
        continue
      }
      const d = new Date(r.endDate)
      const diffMs = d.getTime() - now.getTime()
      const isUrgent = AKSI_STATUSES.includes(r.status) || diffMs <= DAY_MS

      if (isUrgent) {
        urgent.push(r)
      } else if (d <= weekLimit) {
        thisWeek.push(r)
      } else {
        laterDone.push(r)
      }
    }

    return {
      horizonUrgent: urgent,
      horizonThisWeek: thisWeek,
      horizonLaterDone: laterDone,
    }
  }, [filteredRows, now])

  const handleSelectAP = useCallback(async (id: string) => {
    setHighlightedId(id)
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsMobileDrawerOpen(true)
    }
    try {
      const res = await fetch(`/api/action-plans/${id}`)
      if (res.ok) {
        const ap = await res.json()
        setSelectedAP(ap)
      }
    } catch {}
  }, [])

  const load = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const res = await fetch('/api/my-work')
      if (!res.ok) throw new Error('load')
      const json: MyWorkApiResponse = await res.json()
      setData(json)
      setError(null)
    } catch {
      if (!silent) setError('Terjadi kesalahan saat memuat data. Coba lagi.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      setNow(new Date())
      load({ silent: true })
    }, 60_000)
    return () => clearInterval(timer)
  }, [load])

  // Auto-select kartu pertama di layar desktop (>= 1280px) saat load pertama
  useEffect(() => {
    if (data && rows.length > 0 && !selectedAP) {
      if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
        handleSelectAP(rows[0].id)
      }
    }
  }, [data, rows, selectedAP, handleSelectAP])

  const handleChanged = useCallback(() => {
    load({ silent: true })
    if (selectedAP) {
      fetch(`/api/action-plans/${selectedAP.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((ap) => {
          if (ap) setSelectedAP(ap)
        })
    }
  }, [load, selectedAP])

  if (loading) return <MyWorkSkeleton />

  if (error || !data) {
    return <MyWorkErrorState error={error ?? 'Terjadi kesalahan'} onRetry={() => load()} />
  }

  const renderCard = (row: MyWorkItem) => {
    const isSelected = selectedAP?.id === row.id
    const hasChecklist = row.checklistTotal > 0
    const checklistPct = hasChecklist ? Math.round((row.checklistDone / row.checklistTotal) * 100) : 0

    return (
      <div
        key={row.id}
        role="button"
        tabIndex={0}
        onClick={() => handleSelectAP(row.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSelectAP(row.id)
          }
        }}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs'
            : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
        }`}
      >
        {/* Top Header: Priority Dot, Ref Code, Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <PriorityDot priority={row.priority} />
            <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">
              {row.refCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge
              status={row.status}
              styleMap={AP_STATUS_STYLE}
              labelMap={AP_STATUS_LABEL}
            />
            <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSelected ? 'text-blue-600 dark:text-blue-300 translate-x-0.5' : ''}`} />
          </div>
        </div>

        {/* Title */}
        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
          {row.title}
        </p>

        {/* Bottom Meta: Deadline & Checklist */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
          <DeadlineChip iso={row.endDate} now={now} />

          {hasChecklist ? (
            <span className="font-mono font-medium text-slate-500 dark:text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {row.checklistDone}/{row.checklistTotal} ({checklistPct}%)
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {row.taskTitle ? row.taskTitle : 'Action Plan'}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header & Role Personal Console */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {data.user.role === 'MANAGER' ? 'MANAGER' : data.user.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'PIC'} PERSONAL CONSOLE
          </p>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            My Work
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Workspace eksekusi personal: tinjau daftar tugas di kiri dan tuntaskan langsung di panel kanan.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span>Diperbarui {timeAgo(data.generatedAt, now)}</span>
        </span>
      </div>

      {/* Telemetry Ringkas Personal Performance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5 px-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tuntas</p>
            <p className="font-bold text-slate-900 dark:text-slate-100 font-mono">{pct}% ({completeCount}/{rows.length})</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Bukti Kerja</p>
            <p className="font-bold text-slate-900 dark:text-slate-100 font-mono">{evidencePct}% ({withEvidence.length}/{evidenceTotal})</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Butuh Tindakan</p>
            <p className="font-bold text-slate-900 dark:text-slate-100 font-mono">{aksiItems.length} Item</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Draft Proposal</p>
            <p className="font-bold text-slate-900 dark:text-slate-100 font-mono">{proposals.length} Draft</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div role="tablist" aria-label="Filter Action Plan" className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                active
                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold font-mono ${
                  active ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* SPLIT-SCREEN WORKSTATION GRID (>= 1280px 5:7, < 1280px 12-col list + drawer) */}
      <div className="grid gap-6 xl:grid-cols-12 items-start">
        {/* KOLOM KIRI (MASTER LIST TUGAS) */}
        <div className="space-y-4 col-span-12 xl:col-span-5">
          {/* Action Required Banner (Kompak & Collapsible) */}
          {(tab === 'semua' || tab === 'aksi') && aksiItems.length > 0 && (
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300 shrink-0">
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <h2 className="text-xs font-bold text-amber-950 dark:text-amber-200 truncate">
                    Butuh Aksi Anda Segera
                  </h2>
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900 px-1.5 py-0.2 text-[10px] font-bold font-mono text-amber-800 dark:text-amber-300">
                    {aksiItems.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setBannerCollapsed((c) => !c)}
                  className="text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
                >
                  <span>{bannerCollapsed ? 'Buka' : 'Tutup'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${bannerCollapsed ? '' : 'rotate-180'}`} />
                </button>
              </div>

              {!bannerCollapsed && (
                <div className="mt-3 space-y-2">
                  {aksiItems.map((it) => (
                    <div
                      key={it.refCode}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (it.kind === 'ap') handleSelectAP(it.id)
                        else window.location.href = it.href
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          if (it.kind === 'ap') handleSelectAP(it.id)
                          else window.location.href = it.href
                        }
                      }}
                      className="p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/50 bg-white dark:bg-slate-900/80 hover:bg-amber-50/50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            {it.refCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {it.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{it.desc}</p>
                      </div>

                      {it.kind === 'ap' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectAP(it.id)
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors shrink-0 shadow-xs"
                        >
                          Tinjau
                        </button>
                      ) : (
                        <Link
                          href="/proposals"
                          className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold transition-colors shrink-0 shadow-xs"
                        >
                          Buka
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* List Action Plan per Horizon Waktu */}
          {filteredRows.length === 0 ? (
            <WorkstationEmptyState type={tab === 'selesai' ? 'all-done' : 'empty'} />
          ) : (
            <div className="space-y-5">
              {/* HORIZON 1: Hari Ini & Mendesak */}
              {horizonUrgent.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Hari Ini &amp; Mendesak
                    </h3>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                      {horizonUrgent.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {horizonUrgent.map(renderCard)}
                  </div>
                </div>
              )}

              {/* HORIZON 2: Pekan Ini */}
              {horizonThisWeek.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Pekan Ini (7 Hari)
                    </h3>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      {horizonThisWeek.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {horizonThisWeek.map(renderCard)}
                  </div>
                </div>
              )}

              {/* HORIZON 3: Mendatang / Selesai */}
              {horizonLaterDone.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {tab === 'selesai' ? 'Tuntas Selesai' : 'Mendatang & Lainnya'}
                    </h3>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {horizonLaterDone.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {horizonLaterDone.map(renderCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* KOLOM KANAN (WORKSTATION INSPECTOR - DESKTOP >= 1280px) */}
        <div className="hidden xl:block xl:col-span-7 sticky top-20 h-[calc(100vh-10rem)]">
          {selectedAP ? (
            <WorkstationInspector
              actionPlan={selectedAP}
              role={data.user.role as Role}
              userId={data.user.id}
              onChanged={handleChanged}
            />
          ) : (
            <WorkstationEmptyState type={rows.length === 0 ? 'empty' : 'no-selection'} />
          )}
        </div>
      </div>

      {/* DRAWER FALLBACK UNTUK MOBILE & TABLET (< 1280px) */}
      {isMobileDrawerOpen && selectedAP && (
        <ActionPlanDetail
          actionPlan={selectedAP}
          role={data.user.role as Role}
          userId={data.user.id}
          onOpenChange={(open) => {
            setIsMobileDrawerOpen(open)
            if (!open && typeof window !== 'undefined' && window.innerWidth < 1280) {
              setSelectedAP(null)
            }
          }}
          onChanged={handleChanged}
          onEdit={() => {
            window.location.href = `/action-plans?open=${selectedAP.id}&highlight=${selectedAP.id}`
          }}
        />
      )}
    </div>
  )
}
