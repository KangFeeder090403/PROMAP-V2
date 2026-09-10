'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Hourglass,
  Inbox,
  Paperclip,
  XCircle,
} from 'lucide-react'
import { MyWorkSkeleton } from '@/components/my-work/MyWorkSkeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_LABEL, AP_STATUS_STYLE } from '@/lib/status-labels'
import type { MyWorkApiResponse, MyWorkItem, MyWorkProposal } from '@/lib/types/my-work'
import type { ActionPlanStatus, Priority } from '@/lib/generated/prisma/client'

type Tab = 'semua' | 'aksi' | 'minggu' | 'selesai'

const TABS: { key: Tab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'aksi', label: 'Butuh Aksi Saya' },
  { key: 'minggu', label: 'Deadline Minggu Ini' },
  { key: 'selesai', label: 'Selesai' },
]

const AKSI_STATUSES: ActionPlanStatus[] = ['REJECTED', 'EVIDENCE_REQUIRED', 'OVERDUE']
const DONE_STATUSES: ActionPlanStatus[] = ['COMPLETE', 'APPROVED']
// Status yang bukti kerjanya masih bisa dilampirkan PIC — selaras lib/rbac.ts.
// PENDING_APPROVAL sengaja tidak masuk: sudah disubmit, PIC tidak bisa mengubah.
const EVIDENCE_ELIGIBLE: ActionPlanStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'EVIDENCE_REQUIRED',
  'REJECTED',
  'OVERDUE',
]

const DAY_MS = 86_400_000

/** Waktu relatif untuk label "Diperbarui … / Disubmit …". */
function timeAgo(iso: string, now: Date) {
  const diff = now.getTime() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}

/** Meta label tenggat: Lewat / <1 jam / X jam / X hari / Besok. */
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
  kind: BannerKind
  kindLabel: string
  refCode: string
  title: string
  desc: string
  cta: string
  href: string
  icon: React.ReactNode
}

const ACTION_HREF = '/action-plans'

function buildAksiItems(rows: MyWorkItem[], proposals: MyWorkProposal[], now: Date): BannerItem[] {
  const items: BannerItem[] = []

  for (const row of rows) {
    if (!AKSI_STATUSES.includes(row.status)) continue
    if (row.status === 'REJECTED') {
      items.push({
        kind: 'ap',
        kindLabel: 'Perlu Revisi',
        refCode: row.refCode,
        title: row.title,
        desc: row.reviewNote ? `Catatan reviewer: ${row.reviewNote}` : 'Revisi perbaikan dibutuhkan sebelum disubmit ulang.',
        cta: 'Perbaiki Sekarang',
        href: ACTION_HREF,
        icon: <XCircle className="h-4 w-4 shrink-0 text-red-500" />,
      })
    } else if (row.status === 'EVIDENCE_REQUIRED') {
      items.push({
        kind: 'ap',
        kindLabel: 'Bukti Tambahan',
        refCode: row.refCode,
        title: row.title,
        desc: 'Lampirkan bukti kerja tambahan agar bisa diverifikasi reviewer.',
        cta: 'Unggah Bukti',
        href: ACTION_HREF,
        icon: <Paperclip className="h-4 w-4 shrink-0 text-amber-500" />,
      })
    } else {
      items.push({
        kind: 'ap',
        kindLabel: 'Terlambat',
        refCode: row.refCode,
        title: row.title,
        desc: `Melewati tenggat. ${deadlineMeta(row.endDate, now).label} — jangan tunggu lebih lama.`,
        cta: 'Kerjakan Sekarang',
        href: ACTION_HREF,
        icon: <Clock className="h-4 w-4 shrink-0 text-orange-500" />,
      })
    }
  }

  for (const p of proposals) {
    items.push({
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

/** Bar progress checklist — kosong saat AP tidak punya checklist. */
function Progress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="min-w-0 flex-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {total > 0 ? `${done}/${total} item selesai · ${pct}%` : 'Belum ada checklist'}
      </p>
    </div>
  )
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
      <Clock className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

/** Baris Action Plan versi "aktiv" (sedang dikerjakan / deadline / aksi). */
function ActionRow({ row, now, showStatus }: { row: MyWorkItem; now: Date; showStatus?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 p-4 transition-colors hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {row.refCode}
          </span>
          {showStatus && (
            <StatusBadge status={row.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <PriorityDot priority={row.priority} />
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{row.title}</p>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
          {row.projectName || row.taskTitle || 'Action Plan Pribadi'}
        </p>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto sm:flex-1">
        <Progress done={row.checklistDone} total={row.checklistTotal} />
      </div>
      <div className="flex items-center gap-2">
        <DeadlineChip iso={row.endDate} now={now} />
      </div>
    </div>
  )
}

/** Baris "menunggu review" — pill reviewer + waktu submit + tombol. */
function ReviewRow({ row, now }: { row: MyWorkItem; now: Date }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 p-4 transition-colors hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 font-mono text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
            {row.refCode}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <Hourglass className="h-3 w-3" aria-hidden="true" />
            Menunggu verifikasi {row.reviewerName ?? 'Reviewer'}
          </span>
        </div>
        <p className="mt-2.5 truncate text-sm font-medium text-slate-900 dark:text-slate-50">{row.title}</p>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
          {row.projectName || row.taskTitle || 'Action Plan Pribadi'}
        </p>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Disubmit {timeAgo(row.updatedAt, now)}
        </p>
      </div>
      <Link
        href={ACTION_HREF}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50"
      >
        Lihat Pengajuan
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}

function CompleteRow({ row }: { row: MyWorkItem }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {row.refCode}
          </span>
          <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            {row.checklistDone}/{row.checklistTotal} item
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-50">{row.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Selesai pada {new Date(row.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Selesai
      </span>
    </div>
  )
}

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

/**
 * Urut prioritas dulu, baru tenggat terdekat. Referensi Linear: yang mendesak
 * harus di atas, jangan tenggelam di bawah item lama berprioritas rendah.
 */
function byUrgency(rows: MyWorkItem[]) {
  return [...rows].sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
  )
}

/** Grup status untuk tab "Semua". */
function PipelineGroups({ rows, now }: { rows: MyWorkItem[]; now: Date }) {
  const [openComplete, setOpenComplete] = useState(false)

  const inProgress = byUrgency(
    rows.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'NOT_STARTED')
  )
  const inReview = byUrgency(rows.filter((r) => r.status === 'PENDING_APPROVAL'))
  const completed = rows.filter((r) => DONE_STATUSES.includes(r.status))

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      {inProgress.length > 0 && (
        <div>
          <GroupHeader icon="progress" label="Sedang Dikerjakan" count={inProgress.length} />
          <div className="mt-2 space-y-2.5">
            {inProgress.map((r) => (
              <ActionRow key={r.id} row={r} now={now} showStatus />
            ))}
          </div>
        </div>
      )}

      {inReview.length > 0 && (
        <div>
          <GroupHeader icon="review" label="Menunggu Review" count={inReview.length} />
          <div className="mt-2 space-y-2.5">
            {inReview.map((r) => (
              <ReviewRow key={r.id} row={r} now={now} />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOpenComplete((o) => !o)}
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <CircleDashed className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              Selesai
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                {completed.length}
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${openComplete ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {openComplete && (
            <div className="mt-2 space-y-2.5">
              {completed.map((r) => (
                <CompleteRow key={r.id} row={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GroupHeader({ icon, label, count }: { icon: 'progress' | 'review'; label: string; count: number }) {
  const iconNode =
    icon === 'progress' ? (
      <CircleDashed className="h-4 w-4 text-blue-500" aria-hidden="true" />
    ) : (
      <Hourglass className="h-4 w-4 text-indigo-500" aria-hidden="true" />
    )
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      {iconNode}
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{count}</span>
    </div>
  )
}

const BANNER_ICON: Record<string, { wrap: string; icon: React.ReactNode }> = {
  REJECTED: { wrap: 'bg-red-50 dark:bg-red-950/40', icon: <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" /> },
  EVIDENCE_REQUIRED: { wrap: 'bg-amber-50 dark:bg-amber-950/40', icon: <Paperclip className="h-4 w-4 text-amber-500" aria-hidden="true" /> },
  OVERDUE: { wrap: 'bg-orange-50', icon: <Clock className="h-4 w-4 text-orange-500" aria-hidden="true" /> },
  PROPOSAL: { wrap: 'bg-slate-100 dark:bg-slate-800', icon: <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" /> },
}

export function MyWorkClient() {
  const [data, setData] = useState<MyWorkApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('semua')
  const [now, setNow] = useState(() => new Date())

  // Satu jalur fetch. silent=true → refresh latar (interval) tanpa skeleton;
  // data lama tetap tampil sampai data baru masuk, error diam-diam diabaikan.
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
    // Refresh tiap 60 dtk (sesuai janji "Diperbarui Xm lalu") + majukan `now`.
    const timer = setInterval(() => {
      setNow(new Date())
      load({ silent: true })
    }, 60_000)
    return () => clearInterval(timer)
  }, [load])

  const rows = useMemo(() => data?.actionPlans ?? [], [data])
  const proposals = useMemo(() => data?.proposals ?? [], [data])

  const counts = useMemo(() => {
    const today = new Date()
    const weekEnd = new Date(today.getTime() + 7 * DAY_MS)
    return {
      semua: rows.length,
      aksi: rows.filter((r) => AKSI_STATUSES.includes(r.status)).length + proposals.length,
      minggu: rows.filter(
        (r) => !DONE_STATUSES.includes(r.status) && new Date(r.endDate).getTime() >= today.getTime() && new Date(r.endDate) <= weekEnd
      ).length,
      selesai: rows.filter((r) => DONE_STATUSES.includes(r.status)).length,
    }
  }, [rows, proposals])

  if (loading) return <MyWorkSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-800 dark:text-slate-200">{error ?? 'Data tidak tersedia.'}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-4 inline-flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  const aksiItems = buildAksiItems(rows, proposals, now)

  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  const stripe = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS))
  // Dot menyala kalau dateKey endDate persis salah satu dari 7 kotak strip
  // (hari ini inklusif s/d +6). Konsisten dengan jumlah kotak yang dirender.
  const stripKeys = new Set(stripe.map(dateKey))
  const deadlineDays = new Set(
    rows
      .filter((r) => !DONE_STATUSES.includes(r.status) && stripKeys.has(dateKey(new Date(r.endDate))))
      .map((r) => dateKey(new Date(r.endDate)))
  )

  const upcoming = rows
    .filter((r) => !DONE_STATUSES.includes(r.status))
    .sort((a, b) => +new Date(a.endDate) - +new Date(b.endDate))
    .slice(0, 5)

  const completeCount = rows.filter((r) => DONE_STATUSES.includes(r.status)).length
  const inFlight = rows.length - completeCount
  const pct = rows.length > 0 ? Math.round((completeCount / rows.length) * 100) : 0
  const R = 40
  const CIRC = 2 * Math.PI * R

  // Kesiapan Bukti Audit — hanya AP yang buktinya memang masih bisa dilampirkan.
  const evidenceScope = rows.filter((r) => EVIDENCE_ELIGIBLE.includes(r.status))
  const withEvidence = evidenceScope.filter((r) => Boolean(r.evidenceLink))
  const withoutEvidence = evidenceScope.filter((r) => !r.evidenceLink)
  const evidenceTotal = evidenceScope.length
  const evidencePct = evidenceTotal > 0 ? Math.round((withEvidence.length / evidenceTotal) * 100) : 0

  // Komputasi inline — bukan hook (setelah early-return loading/error, hook
  // tidak boleh dipanggil). Ukuran data kecil, memo tidak perlu.
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const filteredRows =
    tab === 'selesai'
      ? rows.filter((r) => DONE_STATUSES.includes(r.status))
      : tab === 'minggu'
        ? rows
            .filter(
              (r) =>
                !DONE_STATUSES.includes(r.status) &&
                new Date(r.endDate).getTime() >= now.getTime() &&
                new Date(r.endDate) <= new Date(todayStart.getTime() + 7 * DAY_MS)
            )
            .sort((a, b) => +new Date(a.endDate) - +new Date(b.endDate))
        : tab === 'aksi'
          ? rows.filter((r) => AKSI_STATUSES.includes(r.status))
          : rows

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {data.user.role === 'MANAGER' ? 'Manager' : data.user.role === 'SUPER_ADMIN' ? 'Admin' : 'PIC'} · Personal Console
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">My Work</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Semua Action Plan, proposal, dan item yang menunggu ditindak — dalam satu tempat.
          </p>
          {(data.user.companyName || data.user.divisionName) && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {[data.user.companyName, data.user.divisionName].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 shadow-sm ring-1 ring-slate-200">
            <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            Diperbarui {timeAgo(data.generatedAt, now)}
          </span>
        </div>
      </div>

      {/* Filter tabs */}
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
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        {/* KOLOM KIRI */}
        <div className="space-y-6 xl:col-span-8">
          {/* Action Required */}
          {tab !== 'selesai' && aksiItems.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </span>
                <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Butuh Aksi Anda</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {aksiItems.length}
                </span>
              </div>
              <div className="mt-3 divide-y divide-amber-200/70">
                {aksiItems.map((it) => (
                  <div key={it.refCode} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-900 ring-1 ring-amber-200">
                          {it.icon}
                        </span>
                        <span className="font-mono text-[11px] font-medium text-amber-800 dark:text-amber-300">{it.refCode}</span>
                        <span className="rounded bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 ring-1 ring-amber-200">
                          {it.kindLabel}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-50">{it.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{it.desc}</p>
                    </div>
                    <Link
                      href={it.href}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-blue-500 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-600"
                    >
                      {it.cta}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Plan Saya */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Action Plan Saya</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {tab === 'semua' && 'Semua Action Plan sesuai pengelompokan status.'}
                {tab === 'aksi' && 'Item yang sedang menunggu tindakan Anda.'}
                {tab === 'minggu' && 'Tenggat dalam 7 hari ke depan.'}
                {tab === 'selesai' && 'Action Plan yang sudah dituntaskan.'}
              </p>
            </div>

            {filteredRows.length === 0 && tab === 'selesai' && (
              <EmptyCard message="Belum ada Action Plan yang selesai." />
            )}
            {filteredRows.length === 0 && tab === 'minggu' && (
              <EmptyCard message="Tidak ada tenggat dalam 7 hari ke depan." />
            )}
            {filteredRows.length === 0 && tab === 'aksi' && (
              <EmptyCard
                message={
                  aksiItems.length > 0
                    ? 'Tidak ada Action Plan yang butuh aksi — cek proposal draft di banner atas.'
                    : 'Semua item sudah beres — tidak ada yang butuh aksi Anda.'
                }
              />
            )}

            {tab === 'semua' && <PipelineGroups rows={rows} now={now} />}
            {tab === 'aksi' && filteredRows.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4 sm:px-5">
                {filteredRows.map((r) => {
                  const wrap = BANNER_ICON[r.status]?.wrap ?? 'bg-slate-100 dark:bg-slate-800'
                  return (
                    <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {r.refCode}
                          </span>
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${wrap}`}>
                            {BANNER_ICON[r.status]?.icon}
                          </span>
                          <StatusBadge status={r.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-50">{r.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{r.projectName || r.taskTitle || 'Action Plan Pribadi'}</p>
                      </div>
                      <div className="flex w-full items-center gap-3 sm:w-auto sm:flex-1">
                        <Progress done={r.checklistDone} total={r.checklistTotal} />
                      </div>
                      <DeadlineChip iso={r.endDate} now={now} />
                    </div>
                  )
                })}
              </div>
            )}
            {tab === 'minggu' && filteredRows.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4 sm:px-5">
                {filteredRows.map((r) => (
                  <ActionRow key={r.id} row={r} now={now} showStatus />
                ))}
              </div>
            )}
            {tab === 'selesai' && filteredRows.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4 sm:px-5">
                {filteredRows.map((r) => (
                  <CompleteRow key={r.id} row={r} />
                ))}
              </div>
            )}

            {rows.length === 0 && proposals.length === 0 && tab === 'semua' && (
              <Link href="/board" className="block border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline sm:px-5">
                Belum ada pekerjaan — lihat Board untuk memulai
              </Link>
            )}
          </div>
        </div>

        {/* KOLOM KANAN */}
        <div className="space-y-6 xl:col-span-4">
          {/* Upcoming Deadlines */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-500" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Tenggat Terdekat</h2>
                </div>
                <span className="rounded-full border border-blue-100 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                  7 Hari ke Depan
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Timeline visual distribusi komitmen Anda minggu ini.
              </p>
            </div>
            <div className="p-4">
              {/* Strip 7 hari */}
              <div className="grid grid-cols-7 gap-1">
                {stripe.map((d) => {
                  const key = dateKey(d)
                  const isToday = key === dateKey(new Date())
                  const hasDeadline = deadlineDays.has(key)
                  return (
                    <div
                      key={key}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2.5 transition-colors ${
                        isToday
                          ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                          : 'border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-medium uppercase opacity-70">
                        {d.toLocaleDateString('id-ID', { weekday: 'short' })}
                      </span>
                      <span className="text-sm font-semibold">{d.getDate()}</span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          hasDeadline ? (isToday ? 'bg-white dark:bg-slate-900' : 'bg-blue-500') : 'bg-transparent'
                        }`}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 space-y-2">
                {upcoming.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">Tidak ada tenggat aktif.</p>
                )}
                {upcoming.map((r) => {
                  const d = new Date(r.endDate)
                  const isLate = d.getTime() < now.getTime()
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${
                          isLate ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-sm font-semibold leading-none">{d.getDate()}</span>
                        <span className="mt-0.5 text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                          {d.toLocaleDateString('id-ID', { month: 'short' })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{r.title}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.refCode}</p>
                      </div>
                      <DeadlineChip iso={r.endDate} now={now} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Progres Penyelesaian */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Progres Penyelesaian</h2>
            </div>
            <div className="flex flex-col items-center p-5">
              <div className="relative h-28 w-28">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r={R} fill="none" strokeWidth="10" className="stroke-slate-100 dark:stroke-slate-800" />
                  <circle
                    cx="50"
                    cy="50"
                    r={R}
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={CIRC * (1 - pct / 100)}
                    className="stroke-blue-500 transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-50">{pct}%</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Tuntas</span>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                dari {rows.length} Action Plan yang ditugaskan ke Anda
              </p>
              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{completeCount}</p>
                  <p className="text-[11px] font-medium text-emerald-700/80">Selesai</p>
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/50 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{inFlight}</p>
                  <p className="text-[11px] font-medium text-blue-700/80">Dalam Proses</p>
                </div>
              </div>
            </div>
          </div>

          {/* Widget Kesiapan Bukti Audit */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Kesiapan Bukti Audit</h2>
              </div>
              <span className="rounded-full border border-blue-100 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                {evidenceTotal > 0 ? `${evidencePct}% Lengkap` : 'Belum Ada'}
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${evidencePct}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {evidenceTotal > 0
                  ? `${withEvidence.length} dari ${evidenceTotal} Action Plan aktif telah memiliki tautan bukti.`
                  : 'Belum ada Action Plan aktif yang perlu dilampiri bukti.'}
              </p>

              {evidenceTotal === 0 ? null : withoutEvidence.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Perlu lampiran bukti:</p>
                  <div className="space-y-1.5">
                    {withoutEvidence.slice(0, 3).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 px-2.5 py-1.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1.5">
                            {r.refCode}
                          </span>
                          <span className="truncate text-slate-800 dark:text-slate-200" title={r.title}>
                            {r.title}
                          </span>
                        </div>
                        <Link
                          href={ACTION_HREF}
                          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                        >
                          Unggah
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Semua Action Plan aktif Anda telah dilengkapi bukti kerja.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <Inbox className="h-5 w-5 text-slate-300" aria-hidden="true" />
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  )
}