'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { History, RefreshCw, User, FileText, ArrowRight, Shield } from 'lucide-react'

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
  }
  actionPlan: {
    id: string
    title: string
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const q = new URLSearchParams({ limit: '50' })
      if (companyId) q.set('companyId', companyId)
      if (filterAction) q.set('action', filterAction)

      const res = await fetch(`/api/audit-logs?${q.toString()}`)
      if (!res.ok) throw new Error('Gagal memuat log audit')
      setLogs(await res.json())
    } catch {
      setError('Terjadi kesalahan saat memuat audit log.')
    } finally {
      setLoading(false)
    }
  }, [companyId, filterAction])

  useEffect(() => {
    if (open) {
      void fetchLogs()
    }
  }, [open, fetchLogs])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col dark:bg-slate-900 dark:border-slate-800 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <History size={18} />
              </div>
              <div>
                <DialogTitle className="text-base text-slate-900 dark:text-slate-100 font-bold">
                  Audit Log Aktivitas Ringkas
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rekaman jejak digital operasi bisnis, transisi status Action Plan, dan tata kelola akun.
                </DialogDescription>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Filter Action chips */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto scrollbar-none">
            {[
              { key: '', label: 'Semua Aksi' },
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
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100 dark:divide-slate-800/80">
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
              <p className="text-xs">Belum ada rekaman log audit pada filter ini.</p>
            </div>
          )}

          {logs.map((log) => {
            const badge = ACTION_BADGE[log.action] ?? {
              label: log.action,
              className: 'bg-slate-100 text-slate-600',
            }

            return (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>

                  {/* Actor user */}
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <strong className="font-semibold">{log.user?.name ?? 'Sistem'}</strong>
                    <span className="text-[10px] font-mono text-slate-400">({log.user?.role})</span>
                  </div>

                  {/* Target Action Plan */}
                  {log.actionPlan && (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <FileText size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{log.actionPlan.title}</span>
                    </div>
                  )}

                  {/* Detail changes */}
                  {(log.oldValue || log.newValue) && (
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5 border border-slate-200/60 dark:border-slate-700/60">
                      {log.oldValue && <span className="line-through text-slate-400">{log.oldValue}</span>}
                      {log.oldValue && log.newValue && <ArrowRight size={11} className="text-slate-400" />}
                      {log.newValue && <span className="font-semibold text-blue-600 dark:text-blue-400">{log.newValue}</span>}
                    </div>
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
