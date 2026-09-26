'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  History,
  RefreshCw,
  User,
  FileText,
  ArrowRight,
  Shield,
  MessageSquare,
  Search,
  Download,
  ExternalLink,
  Activity,
  Layers,
  Clock,
  X,
} from 'lucide-react'
import { AP_STATUS_STYLE, AP_STATUS_LABEL } from '@/lib/status-labels'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface AuditLogItem {
  id: string
  action: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
  user: {
    id: string
    name: string
    role: string
    divisionId?: string | null
  }
  actionPlan: {
    id: string
    title: string
    divisionId?: string | null
    division?: {
      id: string
      name: string
    } | null
  } | null
  project?: {
    id: string
    name: string
    divisionId?: string | null
  } | null
}

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  STATUS_CHANGED: {
    label: 'Ubah Status',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  EVIDENCE_SUBMITTED: {
    label: 'Kirim Bukti',
    className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  },
  COMMENT_ADDED: {
    label: 'Komentar',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  COMMENT_EDITED: {
    label: 'Sunting Komentar',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  },
  REASSIGNED: {
    label: 'Alihkan PIC',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  REMINDER_SENT: {
    label: 'Kirim Pengingat',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
  CREATED: {
    label: 'Dibuat',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  UPDATED: {
    label: 'Diperbarui',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  },
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatRelativeTime(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diffSec < 60) return 'Baru saja'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}j lalu`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}h lalu`
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function safeParseJson(raw: string | null): Record<string, any> | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') return parsed
    return null
  } catch {
    return null
  }
}

function ChangeValueViewer({
  oldVal,
  newVal,
}: {
  oldVal: string | null
  newVal: string | null
}) {
  const parsedOld = safeParseJson(oldVal)
  const parsedNew = safeParseJson(newVal)
  const isJsonPayload = parsedOld !== null || parsedNew !== null

  if (isJsonPayload) {
    const oldStatus = parsedOld?.status ?? (typeof oldVal === 'string' && !parsedOld ? oldVal : null)
    const newStatus = parsedNew?.status ?? (typeof newVal === 'string' && !parsedNew ? newVal : null)
    const reviewNote = parsedNew?.review_note || parsedNew?.reviewNote || parsedNew?.reason || parsedNew?.note

    return (
      <div className="mt-1 space-y-1.5 w-full">
        {(oldStatus || newStatus) && (
          <div className="inline-flex items-center gap-1.5 flex-wrap">
            {oldStatus && (
              <span className="opacity-75">
                {AP_STATUS_LABEL[oldStatus] ? (
                  <StatusBadge
                    status={oldStatus}
                    styleMap={AP_STATUS_STYLE}
                    labelMap={AP_STATUS_LABEL}
                    className="line-through opacity-70 text-[10px] px-2 py-0.5"
                  />
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 line-through bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {String(oldStatus)}
                  </span>
                )}
              </span>
            )}
            {oldStatus && newStatus && <ArrowRight size={11} className="text-slate-400" />}
            {newStatus && (
              <span>
                {AP_STATUS_LABEL[newStatus] ? (
                  <StatusBadge
                    status={newStatus}
                    styleMap={AP_STATUS_STYLE}
                    labelMap={AP_STATUS_LABEL}
                    className="font-semibold text-[10px] px-2 py-0.5 shadow-2xs"
                  />
                ) : (
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                    {String(newStatus)}
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        {reviewNote && (
          <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border-l-2 border-blue-500 text-slate-700 dark:text-slate-200 text-xs">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
              <MessageSquare size={10} className="text-blue-500" />
              <span>Catatan Evaluasi</span>
            </div>
            <p className="italic leading-relaxed">{String(reviewNote)}</p>
          </div>
        )}
      </div>
    )
  }

  const isApStatus = (val: string | null) => (val ? Boolean(AP_STATUS_LABEL[val]) : false)
  if (isApStatus(oldVal) || isApStatus(newVal)) {
    return (
      <div className="inline-flex items-center gap-1.5 mt-0.5 flex-wrap">
        {oldVal && (
          <StatusBadge
            status={oldVal}
            styleMap={AP_STATUS_STYLE}
            labelMap={AP_STATUS_LABEL}
            className="line-through opacity-70 text-[10px] px-2 py-0.5"
          />
        )}
        {oldVal && newVal && <ArrowRight size={11} className="text-slate-400" />}
        {newVal && (
          <StatusBadge
            status={newVal}
            styleMap={AP_STATUS_STYLE}
            labelMap={AP_STATUS_LABEL}
            className="font-semibold text-[10px] px-2 py-0.5 shadow-2xs"
          />
        )}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-0.5 border border-slate-200/60 dark:border-slate-700/60 flex-wrap">
      {oldVal && <span className="line-through text-slate-400">{oldVal}</span>}
      {oldVal && newVal && <ArrowRight size={11} className="text-slate-400" />}
      {newVal && <span className="font-semibold text-blue-600 dark:text-blue-400">{newVal}</span>}
    </div>
  )
}

export function AuditLogModal({
  open,
  onOpenChange,
  companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId?: string | null
}) {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterAction, setFilterAction] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const q = new URLSearchParams({ limit: '100' })
      if (companyId) q.set('companyId', companyId)
      if (filterAction) q.set('action', filterAction)
      if (searchQuery.trim()) q.set('search', searchQuery.trim())

      const res = await fetch(`/api/audit-logs?${q.toString()}`)
      if (!res.ok) throw new Error('Gagal memuat log audit')
      setLogs(await res.json())
    } catch {
      setError('Terjadi kesalahan saat memuat audit log.')
    } finally {
      setLoading(false)
    }
  }, [companyId, filterAction, searchQuery])

  useEffect(() => {
    if (open) {
      void fetchLogs()
    }
  }, [open, fetchLogs])

  // Metrik Ringkas Audit Trail
  const metrics = useMemo(() => {
    const total = logs.length
    const statusChanges = logs.filter((l) => l.action === 'STATUS_CHANGED').length
    const reassignments = logs.filter((l) => l.action === 'REASSIGNED').length
    const reviews = logs.filter((l) => {
      const parsed = safeParseJson(l.newValue)
      return Boolean(parsed?.review_note || parsed?.reviewNote || parsed?.reason)
    }).length
    return { total, statusChanges, reassignments, reviews }
  }, [logs])

  // Export Audit Log ke file CSV
  const handleExportCSV = useCallback(() => {
    if (logs.length === 0) return
    const headers = ['ID Log', 'Waktu (ISO)', 'Nama Aktor', 'Role', 'Aksi', 'Target Action Plan', 'Nilai Lama', 'Nilai Baru']
    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${l.createdAt}"`,
      `"${(l.user?.name ?? 'Sistem').replaceAll('"', '""')}"`,
      `"${l.user?.role ?? ''}"`,
      `"${l.action}"`,
      `"${(l.actionPlan?.title ?? '').replaceAll('"', '""')}"`,
      `"${(l.oldValue ?? '').replaceAll('"', '""')}"`,
      `"${(l.newValue ?? '').replaceAll('"', '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `promap-audit-log-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [logs])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col dark:bg-slate-900 dark:border-slate-800 p-0 overflow-hidden">
        {/* Header Enterprise */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <History size={18} />
              </div>
              <div>
                <DialogTitle className="text-base text-slate-900 dark:text-slate-100 font-bold">
                  Audit Trail &amp; Rekaman Aktivitas Bisnis
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Jejak audit digital kepatuhan operasional, transisi status Action Plan, dan tata kelola tim.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={logs.length === 0}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                title="Unduh rekaman audit dalam format CSV"
              >
                <Download size={12} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loading}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Baris Ringkasan Metrik Audit */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total Event</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{metrics.total}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/40">
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Ubah Status</span>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-0.5">{metrics.statusChanges}</p>
            </div>
            <div className="p-2 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100/60 dark:border-violet-900/40">
              <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider">Alih PIC</span>
              <p className="text-sm font-bold text-violet-700 dark:text-violet-300 mt-0.5">{metrics.reassignments}</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40">
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Evaluasi Catatan</span>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{metrics.reviews}</p>
            </div>
          </div>

          {/* Live Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pengguna, dokumen, catatan..."
                className="h-8 w-full pl-8 pr-7 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
              {[
                { key: '', label: 'Semua' },
                { key: 'STATUS_CHANGED', label: 'Status' },
                { key: 'REASSIGNED', label: 'PIC' },
                { key: 'CREATED', label: 'Dibuat' },
                { key: 'REMINDER_SENT', label: 'Pengingat' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterAction(f.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    filterAction === f.key
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-3 divide-y divide-slate-100 dark:divide-slate-800/80">
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 py-3 text-center">{error}</p>
          )}

          {loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <RefreshCw size={18} className="animate-spin text-blue-500" />
              <p className="text-xs">Memuat rekaman log audit...</p>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Shield size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Belum ada rekaman log audit pada kriteria pencarian ini.</p>
            </div>
          )}

          {logs.map((log) => {
            const badge = ACTION_BADGE[log.action] ?? {
              label: log.action,
              className: 'bg-slate-100 text-slate-600',
            }

            return (
              <div key={log.id} className="py-3.5 flex items-start justify-between gap-4 text-xs group">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badge.className}`}
                    >
                      {badge.label}
                    </span>

                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {formatRelativeTime(log.createdAt)}
                    </span>

                    <span className="text-slate-400 dark:text-slate-500 text-[10px] flex items-center gap-1">
                      <Clock size={10} />
                      {formatFullDate(log.createdAt)}
                    </span>

                    <span className="font-mono text-[9px] text-slate-400 dark:text-slate-600 ml-auto select-all">
                      ID: {log.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Actor user & Role */}
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <span className="text-slate-400 text-xs">Oleh:</span>
                    <strong className="font-semibold text-slate-900 dark:text-slate-100">{log.user?.name ?? 'Sistem Otomatis'}</strong>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                      {log.user?.role}
                    </span>
                  </div>

                  {/* Target Project (log tanpa Action Plan, mis. konversi Proposal) */}
                  {!log.actionPlan && log.project && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 flex-wrap">
                      <FileText size={13} className="text-slate-400 shrink-0" />
                      <span className="text-slate-400 text-xs">Sasaran:</span>
                      <Link
                        href={`/projects/${log.project.id}`}
                        onClick={() => onOpenChange(false)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 truncate max-w-sm"
                        title="Buka detail Project"
                      >
                        <span className="truncate">{log.project.name}</span>
                        <ExternalLink size={10} className="shrink-0" />
                      </Link>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        Project
                      </span>
                    </div>
                  )}

                  {/* Target Action Plan & Division Link */}
                  {log.actionPlan && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 flex-wrap">
                      <FileText size={13} className="text-slate-400 shrink-0" />
                      <span className="text-slate-400 text-xs">Sasaran:</span>
                      <Link
                        href={`/action-plans?open=${log.actionPlan.id}&highlight=${log.actionPlan.id}`}
                        onClick={() => onOpenChange(false)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 truncate max-w-sm"
                        title="Buka detail Action Plan"
                      >
                        <span className="truncate">{log.actionPlan.title}</span>
                        <ExternalLink size={10} className="shrink-0" />
                      </Link>
                      {log.actionPlan.division?.name && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                          {log.actionPlan.division.name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Detail changes (Status transition & formatted notes) */}
                  {(log.oldValue || log.newValue) && (
                    <ChangeValueViewer
                      oldVal={log.oldValue}
                      newVal={log.newValue}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
