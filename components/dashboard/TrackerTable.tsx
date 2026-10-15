'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ArrowRight, ChevronDown, ChevronUp, ListChecks } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  AP_PRIORITY_LABEL,
  AP_PRIORITY_STYLE,
  AP_STATUS_LABEL,
  AP_STATUS_STYLE,
} from '@/lib/status-labels'
import type { TrackerRow } from '@/lib/types/dashboard'
import { TRACKER_CAP } from '@/lib/dashboard-aggregate'

const VISIBLE = 10

type SortKey = 'title' | 'pic' | 'priority' | 'status' | 'progress' | 'deadline'
type Sort = { key: SortKey; dir: 'asc' | 'desc' } | null

const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

function progressOf(r: TrackerRow) {
  return r.checklistTotal > 0 ? r.checklistDone / r.checklistTotal : -1
}

const COMPARE: Record<SortKey, (a: TrackerRow, b: TrackerRow) => number> = {
  title: (a, b) => a.title.localeCompare(b.title, 'id'),
  pic: (a, b) => a.picName.localeCompare(b.picName, 'id'),
  priority: (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9),
  status: (a, b) => (AP_STATUS_LABEL[a.status] ?? a.status).localeCompare(AP_STATUS_LABEL[b.status] ?? b.status, 'id'),
  progress: (a, b) => progressOf(a) - progressOf(b),
  deadline: (a, b) =>
    (a.deadline ? +new Date(a.deadline) : Infinity) - (b.deadline ? +new Date(b.deadline) : Infinity),
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export function TrackerTable({
  rows,
  onOpen,
}: {
  rows: TrackerRow[]
  onOpen: (id: string) => void
}) {
  const [sort, setSort] = useState<Sort>(null)

  // null = urutan server (OVERDUE dulu, lalu tenggat terdekat).
  const sorted = sort
    ? [...rows].sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * COMPARE[sort.key](a, b))
    : rows
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? sorted : sorted.slice(0, VISIBLE)
  // ponytail: API memotong di TRACKER_CAP; selengkapnya di halaman Action Plans.
  const totalLabel = rows.length >= TRACKER_CAP ? `${TRACKER_CAP}+` : String(rows.length)

  const toggle = (key: SortKey) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))

  const th = (k: SortKey, label: string, className = '') => {
    const active = sort?.key === k
    return (
      <th
        key={k}
        scope="col"
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`h-9 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap ${className}`}
      >
        <button
          type="button"
          onClick={() => toggle(k)}
          className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {label}
          {active && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
        </button>
      </th>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none w-full min-w-0 flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <ListChecks className="h-4 w-4 text-fg-secondary shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground truncate">Pelacak Rencana Aksi</h2>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {shown.length} dari {totalLabel}
          </span>
        </div>
        <Link
          href="/action-plans"
          className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-foreground hover:underline underline-offset-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Buka Action Plans <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 px-4 text-center">
          <p className="text-sm text-fg-secondary">Tidak ada rencana aksi aktif pada rentang ini.</p>
          <Link
            href="/action-plans"
            className="mt-3 inline-flex items-center h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors"
          >
            Buka Action Plans
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                {th('title', 'Judul')}
                {th('pic', 'PIC')}
                {th('priority', 'Prioritas', 'hidden lg:table-cell')}
                {th('status', 'Status')}
                {th('progress', 'Progres', 'hidden lg:table-cell')}
                {th('deadline', 'Deadline')}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((r) => {
                const pct = r.checklistTotal > 0 ? Math.round((r.checklistDone / r.checklistTotal) * 100) : null
                return (
                  <tr key={r.id} className="h-9 hover:bg-accent transition-colors">
                    <td className="px-3 py-2 max-w-[18rem]">
                      <button
                        type="button"
                        onClick={() => onOpen(r.id)}
                        className="block w-full text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block truncate font-medium text-foreground hover:underline underline-offset-2">
                          {r.title}
                        </span>
                        <span className="block font-mono text-xs text-muted-foreground">{r.refCode}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2 text-fg-secondary whitespace-nowrap max-w-[10rem] truncate">{r.picName}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <StatusBadge status={r.priority} styleMap={AP_PRIORITY_STYLE} labelMap={AP_PRIORITY_LABEL} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <StatusBadge status={r.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      {pct === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-2 min-w-[6rem]">
                          <div
                            className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Progres ${r.title}`}
                          >
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-fg-secondary w-8 text-right">{pct}%</span>
                        </div>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 font-mono text-xs whitespace-nowrap ${
                        r.status === 'OVERDUE' ? 'text-destructive-text font-semibold' : 'text-fg-secondary'
                      }`}
                    >
                      {r.deadline ? fmtShort(r.deadline) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length > VISIBLE && (
            <div className="py-2 text-center border-t border-border">
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {expanded ? `Ringkas (${VISIBLE} teratas)` : `Lihat semua (${totalLabel})`}
                {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
