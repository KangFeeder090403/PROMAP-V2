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
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  Hourglass,
  Inbox,
  MoreVertical,
  Paperclip,
  XCircle,
} from 'lucide-react'
import { MyWorkSkeleton } from '@/components/my-work/MyWorkSkeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_LABEL, AP_STATUS_STYLE } from '@/lib/status-labels'
import type { MyWorkApiResponse, MyWorkItem, MyWorkProposal } from '@/lib/types/my-work'
import type { ActionPlanStatus, Priority, Role } from '@/lib/generated/prisma/client'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { ActionPlanDetail } from '@/components/action-plans/ActionPlanDetail'
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
        desc: `Melewati tenggat. ${deadlineMeta(row.endDate, now).label} — jangan tunggu lebih lama.`,
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

function CardKebabMenu({
  refCode,
  id,
  onOpenDetail,
}: Readonly<{
  refCode: string
  id: string
  onOpenDetail?: (id: string) => void
}>) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyRefCode = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(refCode)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setOpen(false)
    }, 1200)
  }

  const copyDirectLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/action-plans?open=${id}&highlight=${id}`
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setOpen(false)
    }, 1200)
  }

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Menu aksi ${refCode}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup menu aksi"
            className="fixed inset-0 z-20 cursor-default bg-transparent border-0"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-8 z-30 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg text-xs animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onOpenDetail?.(id)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              Buka Detail Drawer
            </button>
            <button
              type="button"
              onClick={copyRefCode}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              {copied ? 'Tersalin!' : `Salin Kode (${refCode})`}
            </button>
            <button
              type="button"
              onClick={copyDirectLink}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Paperclip className="h-3.5 w-3.5 text-slate-400" />
              Salin Tautan Langsung
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Baris Action Plan versi "aktiv" (sedang dikerjakan / deadline / aksi). */
function ActionRow({
  row,
  now,
  showStatus,
  highlighted,
  onSelect,
}: Readonly<{
  row: MyWorkItem
  now: Date
  showStatus?: boolean
  highlighted?: boolean
  onSelect?: (id: string) => void
}>) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(row.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(row.id)
        }
      }}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-4 transition-all cursor-pointer ${
        highlighted
          ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm'
          : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800'
      }`}
    >
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
        <CardKebabMenu refCode={row.refCode} id={row.id} onOpenDetail={onSelect} />
      </div>
    </div>
  )
}

/** Baris "menunggu review" — pill reviewer + waktu submit + tombol. */
function ReviewRow({
  row,
  now,
  highlighted,
  onSelect,
}: Readonly<{
  row: MyWorkItem
  now: Date
  highlighted?: boolean
  onSelect?: (id: string) => void
}>) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(row.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(row.id)
        }
      }}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-4 transition-all cursor-pointer ${
        highlighted
          ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm'
          : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800'
      }`}
    >
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect?.(row.id)
          }}
          className="inline-flex h-8 w-36 shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 text-center"
        >
          Lihat Pengajuan
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <CardKebabMenu refCode={row.refCode} id={row.id} onOpenDetail={onSelect} />
      </div>
    </div>
  )
}

function CompleteRow({
  row,
  highlighted,
  onSelect,
}: Readonly<{
  row: MyWorkItem
  highlighted?: boolean
  onSelect?: (id: string) => void
}>) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(row.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(row.id)
        }
      }}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3 px-2 rounded-lg transition-all cursor-pointer ${
        highlighted
          ? 'ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-950/40'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
      }`}
    >
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
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Selesai
        </span>
        <CardKebabMenu refCode={row.refCode} id={row.id} onOpenDetail={onSelect} />
      </div>
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
function PipelineGroups({
  rows,
  now,
  highlightedId,
  onSelect,
}: Readonly<{
  rows: MyWorkItem[]
  now: Date
  highlightedId: string | null
  onSelect: (id: string) => void
}>) {
  const [openComplete, setOpenComplete] = useState(false)

  const needsAction = byUrgency(
    rows.filter((r) => AKSI_STATUSES.includes(r.status))
  )
  const inProgress = byUrgency(
    rows.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'NOT_STARTED')
  )
  const inReview = byUrgency(rows.filter((r) => r.status === 'PENDING_APPROVAL'))
  const completed = rows.filter((r) => DONE_STATUSES.includes(r.status))

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      {needsAction.length > 0 && (
        <div>
          <GroupHeader icon="action" label="Perlu Tindakan & Revisi" count={needsAction.length} />
          <div className="mt-2 space-y-2.5">
            {needsAction.map((r) => (
              <ActionRow
                key={r.id}
                row={r}
                now={now}
                showStatus
                highlighted={highlightedId === r.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}

      {inProgress.length > 0 && (
        <div>
          <GroupHeader icon="progress" label="Sedang Dikerjakan" count={inProgress.length} />
          <div className="mt-2 space-y-2.5">
            {inProgress.map((r) => (
              <ActionRow
                key={r.id}
                row={r}
                now={now}
                showStatus
                highlighted={highlightedId === r.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}

      {inReview.length > 0 && (
        <div>
          <GroupHeader icon="review" label="Menunggu Review" count={inReview.length} />
          <div className="mt-2 space-y-2.5">
            {inReview.map((r) => (
              <ReviewRow
                key={r.id}
                row={r}
                now={now}
                highlighted={highlightedId === r.id}
                onSelect={onSelect}
              />
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
                <CompleteRow
                  key={r.id}
                  row={r}
                  highlighted={highlightedId === r.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GroupHeader({
  icon,
  label,
  count,
}: Readonly<{
  icon: 'progress' | 'review' | 'action'
  label: string
  count: number
}>) {
  const iconNode =
    icon === 'progress' ? (
      <CircleDashed className="h-4 w-4 text-blue-500" aria-hidden="true" />
    ) : icon === 'review' ? (
      <Hourglass className="h-4 w-4 text-indigo-500" aria-hidden="true" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
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

function computeMyWorkCounts(rows: MyWorkItem[], proposals: MyWorkProposal[]) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(todayStart.getTime() + 7 * DAY_MS)
  return {
    semua: rows.length,
    aksi: rows.filter((r) => (AKSI_STATUSES as readonly string[]).includes(r.status)).length + proposals.length,
    minggu: rows.filter(
      (r) =>
        !(DONE_STATUSES as readonly string[]).includes(r.status) &&
        new Date(r.endDate).getTime() >= todayStart.getTime() &&
        new Date(r.endDate) <= weekEnd
    ).length,
    selesai: rows.filter((r) => (DONE_STATUSES as readonly string[]).includes(r.status)).length,
  }
}

function computeUpcomingWork(rows: MyWorkItem[], selectedDateKey: string | null): MyWorkItem[] {
  const active = rows.filter((r) => !(DONE_STATUSES as readonly string[]).includes(r.status))
  if (selectedDateKey) {
    return active
      .filter((r) => dateKey(new Date(r.endDate)) === selectedDateKey)
      .sort((a, b) => +new Date(a.endDate) - +new Date(b.endDate))
  }
  return active.sort((a, b) => +new Date(a.endDate) - +new Date(b.endDate)).slice(0, 5)
}

function filterMyWorkRows(rows: MyWorkItem[], tab: Tab, todayStart: Date): MyWorkItem[] {
  if (tab === 'selesai') {
    return rows.filter((r) => (DONE_STATUSES as readonly string[]).includes(r.status))
  }
  if (tab === 'minggu') {
    const weekEndTime = todayStart.getTime() + 7 * DAY_MS
    return rows
      .filter(
        (r) =>
          !(DONE_STATUSES as readonly string[]).includes(r.status) &&
          new Date(r.endDate).getTime() >= todayStart.getTime() &&
          new Date(r.endDate).getTime() <= weekEndTime
      )
      .sort((a, b) => +new Date(a.endDate) - +new Date(b.endDate))
  }
  if (tab === 'aksi') {
    return rows.filter((r) => (AKSI_STATUSES as readonly string[]).includes(r.status))
  }
  return rows
}

function MyWorkErrorState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
        <AlertTriangle className="h-5 w-5 text-red-500" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-800 dark:text-slate-200">{error ?? 'Data tidak tersedia.'}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600"
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
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [bannerCollapsed, setBannerCollapsed] = useState(false)

  const handleOpenDetail = useCallback(async (id: string) => {
    setHighlightedId(id)
    try {
      const res = await fetch(`/api/action-plans/${id}`)
      if (res.ok) {
        const ap = await res.json()
        setSelectedAP(ap)
      }
    } catch {}
  }, [])

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

  const counts = useMemo(() => computeMyWorkCounts(rows, proposals), [rows, proposals])

  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [now])

  const aksiItems = useMemo(() => buildAksiItems(rows, proposals, now), [rows, proposals, now])

  const weekStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [now])

  const stripe = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS)),
    [weekStart]
  )

  // Dot menyala kalau dateKey endDate persis salah satu dari 7 kotak strip
  // (hari ini inklusif s/d +6). Konsisten dengan jumlah kotak yang dirender.
  const stripKeys = useMemo(() => new Set(stripe.map(dateKey)), [stripe])
  const deadlineDays = useMemo(
    () =>
      new Set(
        rows
          .filter((r) => !DONE_STATUSES.includes(r.status) && stripKeys.has(dateKey(new Date(r.endDate))))
          .map((r) => dateKey(new Date(r.endDate)))
      ),
    [rows, stripKeys]
  )

  const upcoming = useMemo(() => computeUpcomingWork(rows, selectedDateKey), [rows, selectedDateKey])

  const completeCount = useMemo(() => rows.filter((r) => DONE_STATUSES.includes(r.status)).length, [rows])
  const inFlight = rows.length - completeCount
  const pct = rows.length > 0 ? Math.round((completeCount / rows.length) * 100) : 0
  const R = 40
  const CIRC = 2 * Math.PI * R

  // Kesiapan Bukti Audit — hanya AP yang buktinya memang masih bisa dilampirkan.
  const evidenceScope = useMemo(() => rows.filter((r) => EVIDENCE_ELIGIBLE.includes(r.status)), [rows])
  const withEvidence = useMemo(() => evidenceScope.filter((r) => Boolean(r.evidenceLink)), [evidenceScope])
  const withoutEvidence = useMemo(() => evidenceScope.filter((r) => !r.evidenceLink), [evidenceScope])
  const evidenceTotal = evidenceScope.length
  const evidencePct = evidenceTotal > 0 ? Math.round((withEvidence.length / evidenceTotal) * 100) : 0

  const filteredRows = useMemo(() => filterMyWorkRows(rows, tab, todayStart), [rows, tab, todayStart])

  if (loading) return <MyWorkSkeleton />

  if (error || !data) {
    return <MyWorkErrorState error={error} onRetry={() => load()} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {data.user.role === 'MANAGER' ? 'MANAGER' : data.user.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'PIC'} PERSONAL CONSOLE
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
        {/* KOLOM KIRI */}
        <div className="space-y-6 xl:col-span-8">
          {/* Action Required Banner - tampil di tab 'semua' dan tab 'aksi' jika ada item yang butuh aksi */}
          {(tab === 'semua' || tab === 'aksi') && aksiItems.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </span>
                  <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Butuh Aksi Anda Segera</h2>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {aksiItems.length}
                  </span>
                </div>
                {tab === 'semua' && (
                  <button
                    type="button"
                    onClick={() => setBannerCollapsed((c) => !c)}
                    className="flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300 hover:text-amber-900 hover:underline"
                  >
                    {bannerCollapsed ? 'Tampilkan' : 'Ciutkan'}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${bannerCollapsed ? '' : 'rotate-180'}`} />
                  </button>
                )}
              </div>

              {!bannerCollapsed && (
                <div className="mt-3 divide-y divide-amber-200/70">
                  {aksiItems.map((it) => {
                    const isHighlighted = highlightedId === it.id
                    return (
                      <div
                        key={it.refCode}
                        onClick={() => {
                          if (it.kind === 'ap') handleOpenDetail(it.id)
                        }}
                        className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3 px-2 rounded-lg transition-all cursor-pointer ${
                          isHighlighted
                            ? 'ring-2 ring-blue-500 bg-amber-100/80 dark:bg-amber-900/60 shadow-sm'
                            : 'hover:bg-amber-100/40 dark:hover:bg-amber-900/20'
                        }`}
                      >
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
                        <div className="flex items-center gap-2 shrink-0">
                          {it.kind === 'ap' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenDetail(it.id)
                              }}
                              className="inline-flex h-8 w-24 shrink-0 items-center justify-center rounded-md border border-amber-300 dark:border-amber-800 bg-white/90 dark:bg-slate-900/90 px-2 text-xs font-medium text-amber-900 dark:text-amber-200 transition-colors hover:bg-white dark:hover:bg-slate-800 text-center"
                            >
                              Lihat Detail
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (it.kind === 'ap') {
                                handleOpenDetail(it.id)
                              } else {
                                window.location.href = it.href
                              }
                            }}
                            className="inline-flex h-8 w-36 shrink-0 items-center justify-center gap-1.5 rounded-md bg-blue-500 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-600 text-center"
                          >
                            {it.cta}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'aksi' && aksiItems.length === 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Semua item sudah beres — tidak ada yang butuh aksi Anda.
              </p>
            </div>
          )}

          {/* Action Plan Saya - tampil di tab selain 'aksi' */}
          {tab !== 'aksi' && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Action Plan Saya</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {tab === 'semua' && 'Semua Action Plan sesuai pengelompokan status.'}
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

              {tab === 'semua' && (
                <PipelineGroups
                  rows={rows}
                  now={now}
                  highlightedId={highlightedId}
                  onSelect={handleOpenDetail}
                />
              )}
              {tab === 'minggu' && filteredRows.length > 0 && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4 sm:px-5">
                  {filteredRows.map((r) => (
                    <ActionRow
                      key={r.id}
                      row={r}
                      now={now}
                      showStatus
                      highlighted={highlightedId === r.id}
                      onSelect={handleOpenDetail}
                    />
                  ))}
                </div>
              )}
              {tab === 'selesai' && filteredRows.length > 0 && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4 sm:px-5">
                  {filteredRows.map((r) => (
                    <CompleteRow
                      key={r.id}
                      row={r}
                      highlighted={highlightedId === r.id}
                      onSelect={handleOpenDetail}
                    />
                  ))}
                </div>
              )}

              {rows.length === 0 && proposals.length === 0 && tab === 'semua' && (
                <Link href="/board" className="block border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline sm:px-5">
                  Belum ada pekerjaan — lihat Board untuk memulai
                </Link>
              )}
            </div>
          )}
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
                Pilih tanggal pada strip untuk memfilter Action Plan bertenggat pada hari tersebut.
              </p>
            </div>
            <div className="p-4">
              {/* Strip 7 hari interaktif */}
              <div className="grid grid-cols-7 gap-1">
                {stripe.map((d) => {
                  const key = dateKey(d)
                  const isToday = key === dateKey(new Date())
                  const isSelected = selectedDateKey === key
                  const hasDeadline = deadlineDays.has(key)
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedDateKey((prev) => (prev === key ? null : key))}
                      aria-pressed={isSelected}
                      title={`Filter tenggat ${d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-900'
                          : isToday
                            ? 'border-blue-500 bg-blue-500 text-white shadow-sm hover:bg-blue-600'
                            : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-[10px] font-medium uppercase opacity-75">
                        {d.toLocaleDateString('id-ID', { weekday: 'short' })}
                      </span>
                      <span className="text-sm font-semibold">{d.getDate()}</span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          hasDeadline
                            ? isSelected || isToday
                              ? 'bg-white dark:bg-slate-900'
                              : 'bg-blue-500'
                            : 'bg-transparent'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>

              {/* Status filter tanggal */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {selectedDateKey
                    ? `Tenggat ${selectedDateKey.split('-').reverse().join('/')}`
                    : '5 Tenggat Terdekat'}
                </span>
                {selectedDateKey && (
                  <button
                    type="button"
                    onClick={() => setSelectedDateKey(null)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              <div className="mt-2.5 space-y-2">
                {upcoming.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    {selectedDateKey ? 'Tidak ada tenggat pada tanggal ini.' : 'Tidak ada tenggat aktif.'}
                  </p>
                )}
                {upcoming.map((r) => {
                  const d = new Date(r.endDate)
                  const isLate = d.getTime() < now.getTime()
                  const isHighlighted = highlightedId === r.id
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleOpenDetail(r.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
                        isHighlighted
                          ? 'ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
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
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(r.id)}
                          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                        >
                          Unggah
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </button>
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

      {/* Drawer Detail Action Plan */}
      {selectedAP && (
        <ActionPlanDetail
          actionPlan={selectedAP}
          role={data.user.role as Role}
          userId={data.user.id}
          onOpenChange={(open) => {
            if (!open) setSelectedAP(null)
          }}
          onChanged={() => {
            load({ silent: true })
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

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <Inbox className="h-5 w-5 text-slate-300" aria-hidden="true" />
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  )
}