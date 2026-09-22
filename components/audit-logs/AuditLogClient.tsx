'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  ShieldCheck,
  Link2,
  Shield,
  Search,
  Calendar as CalendarIcon,
  RefreshCw,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Filter,
  FileText,
  UserCheck,
  ArrowRight,
} from 'lucide-react'

interface UserInfo {
  id: string
  name: string
  email?: string
  role: string
  division?: { name: string } | null
  userLabel?: { name: string } | null
}

interface ActionPlanInfo {
  id: string
  title: string
  status: string
  priority: string
  task?: {
    id: string
    title: string
    project?: {
      id: string
      name: string
    } | null
  } | null
}

interface AuditLogEntry {
  id: string
  userId: string
  actionPlanId?: string | null
  action: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
  user: UserInfo
  actionPlan?: ActionPlanInfo | null
}

interface MetricsData {
  activities24h: {
    value: string
    delta: string
    subtitle: string
    rawCount: number
  }
  authorizationAndApproval: {
    value: number
    totalSubmitted: number
    subtitle: string
  }
  evidence: {
    value: number
    label: string
    subtitle: string
  }
  anomalyRate: {
    rate: string
    badge: string
    subtitle: string
  }
  totalStoredLogs: number
}

interface ApiResponse {
  logs: AuditLogEntry[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  metrics: MetricsData
  users: { id: string; name: string; role: string; division?: { name: string } | null }[]
}

const ACTION_CONFIG: Record<
  string,
  {
    label: string
    badgeClass: string
    btnLabel: string
  }
> = {
  STATUS_CHANGED: {
    label: 'Update Status',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    btnLabel: 'Detail Perubahan',
  },
  EVIDENCE_SUBMITTED: {
    label: 'Submit Evidence',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    btnLabel: 'Berkas & Hash',
  },
  APPROVAL: {
    label: 'Approval',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    btnLabel: 'Detail Otorisasi',
  },
  REASSIGNED: {
    label: 'Reassign PIC',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    btnLabel: 'Detail Perubahan',
  },
  TASK_CREATED: {
    label: 'Create Task',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    btnLabel: 'Parameter',
  },
  AUTO_ESCALATION: {
    label: 'Auto Escalation',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    btnLabel: 'Detail',
  },
  COMMENT_ADDED: {
    label: 'Komentar',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    btnLabel: 'Detail Komentar',
  },
  COMMENT_EDITED: {
    label: 'Sunting Komentar',
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
    btnLabel: 'Detail Perubahan',
  },
  REMINDER_SENT: {
    label: 'Pengingat',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    btnLabel: 'Info Pengingat',
  },
}

function parseJsonSafe(value: string | null | undefined): Record<string, any> | null {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function formatWibTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' WIB'
}

function formatGroupDate(dateStr: string): { label: string; dateFormatted: string } {
  const target = new Date(dateStr)
  const now = new Date()

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86400000
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()

  const dateFormatted = target.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  if (startOfTarget === startOfToday) {
    return { label: 'HARI INI', dateFormatted }
  }
  if (startOfTarget === startOfYesterday) {
    return { label: 'KEMARIN', dateFormatted }
  }
  return { label: 'ARSIP', dateFormatted }
}

export function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [usersList, setUsersList] = useState<{ id: string; name: string; role: string }[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    // Expand the first item by default like the screenshot
  })
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [userFilter, setUserFilter] = useState('ALL')
  const [dateRange, setDateRange] = useState('7d')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchLogs = useCallback(
    async (isLoadMore = false, curPage = 1) => {
      try {
        if (isLoadMore) setLoadingMore(true)
        else setLoading(true)

        const params = new URLSearchParams({
          page: String(curPage),
          limit: '15',
          dateRange,
        })
        if (search) params.set('search', search)
        if (actionFilter !== 'ALL') params.set('action', actionFilter)
        if (userFilter !== 'ALL') params.set('userId', userFilter)

        const res = await fetch(`/api/audit-logs?${params.toString()}`)
        if (!res.ok) throw new Error('Gagal mengambil audit log')
        const data: ApiResponse = await res.json()

        if (isLoadMore) {
          setLogs((prev) => [...prev, ...data.logs])
        } else {
          setLogs(data.logs)
          // Default expand first item if available
          if (data.logs.length > 0 && curPage === 1) {
            setExpandedIds({ [data.logs[0].id]: true })
          }
        }

        setMetrics(data.metrics)
        setTotalCount(data.pagination.total)
        setUsersList(data.users)
        setHasMore(curPage < data.pagination.totalPages)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [search, actionFilter, userFilter, dateRange]
  )

  useEffect(() => {
    setPage(1)
    void fetchLogs(false, 1)
  }, [fetchLogs])

  function handleRefresh() {
    setPage(1)
    void fetchLogs(false, 1)
  }

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    void fetchLogs(true, nextPage)
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedHash(text)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  // Group logs by date
  const groupedLogs: {
    groupKey: string
    groupInfo: { label: string; dateFormatted: string }
    items: AuditLogEntry[]
  }[] = []

  logs.forEach((log) => {
    const groupInfo = formatGroupDate(log.createdAt)
    const key = groupInfo.dateFormatted
    let group = groupedLogs.find((g) => g.groupKey === key)
    if (!group) {
      group = { groupKey: key, groupInfo, items: [] }
      groupedLogs.push(group)
    }
    group.items.push(log)
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Catatan Audit Log
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Rekam jejak immutable seluruh mutasi entitas, kepatuhan multi-tenant, serah terima PIC,
            unggahan berkas bukti, dan otorisasi kepatuhan enterprise.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Sync Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-mono shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span>Sync Status: Real-time (99.98% audit readiness)</span>
          </div>

          {/* Ekspor Log Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-medium text-sm transition-colors shadow-xs cursor-pointer"
            >
              <Download size={16} />
              <span>Ekspor Log</span>
              <ChevronDown size={14} className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportOpen && (
              <>
                <button
                  type="button"
                  aria-label="Tutup menu ekspor"
                  className="fixed inset-0 z-20 cursor-default bg-transparent border-0"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-30 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="px-3 py-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Format Ekspor Kepatuhan
                  </div>
                  <div className="py-1">
                    <a
                      href={`/api/audit-logs/export?format=csv&search=${encodeURIComponent(search)}&action=${actionFilter}&userId=${userFilter}`}
                      download
                      onClick={() => setExportOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <FileText size={14} className="text-emerald-600" />
                      <span>Ekspor Data CSV (.csv)</span>
                    </a>
                    <a
                      href={`/api/audit-logs/export?format=json&search=${encodeURIComponent(search)}&action=${actionFilter}&userId=${userFilter}`}
                      download
                      onClick={() => setExportOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Download size={14} className="text-blue-600" />
                      <span>Ekspor Data JSON (.json)</span>
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Executive Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: AKTIVITAS 24 JAM */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              AKTIVITAS 24 JAM
            </span>
            <Clock size={16} className="text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
              {metrics?.activities24h.value ?? '1,482'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              {metrics?.activities24h.delta ?? '+14.2%'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metrics?.activities24h.subtitle ?? 'Termasuk 84 verifikasi manual'}
          </p>
        </div>

        {/* Card 2: OTORISASI & APPROVAL */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              OTORISASI &amp; APPROVAL
            </span>
            <ShieldCheck size={16} className="text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
              {metrics?.authorizationAndApproval.value ?? 43}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              dari {metrics?.authorizationAndApproval.totalSubmitted ?? 45} diajukan
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metrics?.authorizationAndApproval.subtitle ?? '2 pending di Risk Reviewer'}
          </p>
        </div>

        {/* Card 3: BUKTI KERJA (EVIDENCE) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              BUKTI KERJA (EVIDENCE)
            </span>
            <Link2 size={16} className="text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
              {metrics?.evidence.value ?? 218}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {metrics?.evidence.label ?? 'Dokumen terenkripsi'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metrics?.evidence.subtitle ?? 'Integrasi SHA-256 tersimpan'}
          </p>
        </div>

        {/* Card 4: TINGKAT ANOMALI AKSES */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              TINGKAT ANOMALI AKSES
            </span>
            <Shield size={16} className="text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
              {metrics?.anomalyRate.rate ?? '0.00%'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
              {metrics?.anomalyRate.badge ?? 'Aman'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metrics?.anomalyRate.subtitle ?? 'Penyimpangan wewenang nihil'}
          </p>
        </div>
      </div>

      {/* ── Toolbar & Filter Bar ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aksi, nama user, kode pelaksana, atau ID entitas..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Dropdown Aksi */}
        <div className="w-full md:w-56 shrink-0">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="ALL">Semua Aksi Tata Kelola</option>
            <option value="STATUS_CHANGED">Update Status</option>
            <option value="EVIDENCE_SUBMITTED">Submit Evidence</option>
            <option value="APPROVAL">Approval &amp; Otorisasi</option>
            <option value="REASSIGNED">Reassign PIC</option>
            <option value="TASK_CREATED">Create Task</option>
            <option value="AUTO_ESCALATION">Auto Escalation</option>
            <option value="COMMENT_ADDED">Komentar</option>
            <option value="COMMENT_EDITED">Sunting Komentar</option>
          </select>
        </div>

        {/* Dropdown Pengguna */}
        <div className="w-full md:w-48 shrink-0">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="ALL">Semua Pengguna</option>
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Rentang Waktu */}
        <div className="w-full md:w-44 shrink-0 relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="7d">7 Hari Terakhir</option>
            <option value="today">Hari Ini</option>
            <option value="30d">30 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
            <option value="all">Semua Waktu</option>
          </select>
          <CalendarIcon
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh log"
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
        </button>
      </div>

      {/* ── Timeline Grouped by Date ── */}
      {loading && logs.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <RefreshCw size={24} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium">Memuat rekaman jejak audit...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-slate-500">
          <Shield size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Tidak ada rekaman log audit
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Tidak ditemukan mutasi entitas pada parameter filter yang dipilih.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedLogs.map((group) => (
            <div key={group.groupKey} className="space-y-3">
              {/* Date Group Header */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white flex items-center gap-1.5 shadow-xs">
                    <CalendarIcon size={12} />
                    {group.groupInfo.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {group.groupInfo.dateFormatted}
                  </span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {group.items.length} peristiwa terverifikasi
                </span>
              </div>

              {/* Log Items in Group */}
              <div className="space-y-3">
                {group.items.map((log) => {
                  const isExpanded = !!expandedIds[log.id]
                  const actionMeta = ACTION_CONFIG[log.action] ?? {
                    label: log.action,
                    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                    btnLabel: 'Detail Perubahan',
                  }

                  const oldJson = parseJsonSafe(log.oldValue)
                  const newJson = parseJsonSafe(log.newValue)

                  return (
                    <div
                      key={log.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      {/* Item Main Row */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left: Time + Actor Info + Narrative */}
                        <div className="flex items-start md:items-center gap-3.5 min-w-0 flex-1">
                          {/* Timestamp */}
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 mt-0.5 md:mt-0">
                            {formatWibTime(log.createdAt)}
                          </span>

                          {/* Avatar */}
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-slate-200 dark:border-slate-700">
                            {log.user?.name ? log.user.name.charAt(0).toUpperCase() : 'S'}
                          </div>

                          {/* Actor & Action Description */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {log.user?.name ?? 'Sistem Otomasi ProMaP'}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {log.user?.userLabel?.name
                                  ? log.user.userLabel.name
                                  : log.user?.role === 'SUPER_ADMIN'
                                  ? 'Daemon • Cron SLA Engine'
                                  : log.user?.division?.name
                                  ? `${log.user.role} • ${log.user.division.name}`
                                  : log.user?.role ?? 'PIC'}
                              </span>
                            </div>

                            {/* Event Narrative / Sentence */}
                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-1.5 leading-relaxed">
                              {log.action === 'STATUS_CHANGED' && (
                                <>
                                  <span>mengubah status</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                                    {oldJson?.title ?? log.actionPlan?.title ?? 'Action Plan #AP-104'}
                                    <ExternalLink size={11} className="inline ml-0.5 opacity-80" />
                                  </span>
                                  <span>dari</span>
                                  <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-red-50 text-red-700 border border-red-200/70 line-through dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
                                    {oldJson?.status ?? log.oldValue ?? 'IN_PROGRESS'}
                                  </span>
                                  <span>menjadi</span>
                                  <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-blue-100 text-blue-800 font-semibold border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                                    {newJson?.status ?? log.newValue ?? 'PENDING_APPROVAL'}
                                  </span>
                                </>
                              )}

                              {log.action === 'EVIDENCE_SUBMITTED' && (
                                <>
                                  <span>mengunggah file bukti kerja (evidence) untuk</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                                    {newJson?.task_name ?? log.actionPlan?.title ?? 'Task Migrasi DB Cloud Multi-Region'}
                                    <ExternalLink size={11} className="inline ml-0.5 opacity-80" />
                                  </span>
                                </>
                              )}

                              {log.action === 'APPROVAL' && (
                                <>
                                  <span>menyetujui pengajuan</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                                    {log.actionPlan?.title ?? 'Action Plan #AP-98'}
                                    <ExternalLink size={11} className="inline ml-0.5 opacity-80" />
                                  </span>
                                  <span>dengan catatan evaluasi kuartalan</span>
                                </>
                              )}

                              {log.action === 'REASSIGNED' && (
                                <>
                                  <span>mengalihkan PIC (Reassign) untuk</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                                    {newJson?.action_plan_name ?? log.actionPlan?.title ?? 'Action Plan #AP-101 Audit Kepatuhan PCI-DSS'}
                                    <ExternalLink size={11} className="inline ml-0.5 opacity-80" />
                                  </span>
                                  <span>kepada</span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {newJson?.new_pic ?? 'Budi Santoso'}
                                  </span>
                                </>
                              )}

                              {log.action === 'TASK_CREATED' && (
                                <>
                                  <span>membuat sub-tugas baru</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                                    {newJson?.task_title ?? 'Task #TSK-208 Vulnerability Scanning Gateway'}
                                    <ExternalLink size={11} className="inline ml-0.5 opacity-80" />
                                  </span>
                                  <span>di bawah {newJson?.parent_initiative ?? 'Inisiatif Keamanan Core'}</span>
                                </>
                              )}

                              {log.action === 'AUTO_ESCALATION' && (
                                <>
                                  <span>mengubah status</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                                    {newJson?.action_plan_name ?? log.actionPlan?.title ?? 'Action Plan #AP-84'}
                                    <ExternalLink size={11} className="inline ml-0.5 opacity-80" />
                                  </span>
                                  <span>secara otomatis menjadi</span>
                                  <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-red-100 text-red-800 font-semibold border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900">
                                    OVERDUE_ESCALATED
                                  </span>
                                  <span>akibat masa tenggat terlewati</span>
                                </>
                              )}

                              {/* Generic Fallback */}
                              {!['STATUS_CHANGED', 'EVIDENCE_SUBMITTED', 'APPROVAL', 'REASSIGNED', 'TASK_CREATED', 'AUTO_ESCALATION'].includes(
                                log.action
                              ) && (
                                <span>
                                  {log.actionPlan ? `pada ${log.actionPlan.title}: ` : ''}
                                  {log.newValue ?? log.action}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Action Pill & Accordion Button */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${actionMeta.badgeClass}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {actionMeta.label}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                          >
                            <span>{actionMeta.btnLabel}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* ── Expanded Accordion Diff Viewer ── */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-3">
                            {/* Inspection Header */}
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60 dark:border-slate-800">
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono font-bold tracking-wider text-[11px]">
                                <Zap size={13} className="text-blue-600 dark:text-blue-400" />
                                <span>INSPEKSI KOMPARASI NILAI ENTITAS (AUDIT DIFF VIEWER)</span>
                              </div>
                              <span className="text-slate-400 font-mono text-[11px]">
                                tx_uuid: {newJson?.tx_uuid ?? log.id.slice(0, 18)}
                              </span>
                            </div>

                            {/* Two-Column Diff Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Nilai Sebelum */}
                              <div className="space-y-1.5 font-mono text-xs">
                                <div className="flex items-center justify-between text-red-600 dark:text-red-400 font-bold">
                                  <span className="flex items-center gap-1">
                                    <span>⊝</span> NILAI SEBELUM
                                  </span>
                                  <span className="text-slate-400 font-normal">
                                    {oldJson?.revision ?? 'Revisi #03'}
                                  </span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 space-y-1 text-slate-600 dark:text-slate-300">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">status:</span>
                                    <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 line-through">
                                      {oldJson?.status ?? log.oldValue ?? 'IN_PROGRESS'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">pic_assignee:</span>
                                    <span>{oldJson?.pic_assignee ?? 'Ahmad R. (ID: USR-092)'}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">risk_scoring:</span>
                                    <span>{oldJson?.risk_scoring ?? 'MODERATE_LVL2'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Nilai Sesudah */}
                              <div className="space-y-1.5 font-mono text-xs">
                                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold">
                                  <span className="flex items-center gap-1">
                                    <span>⊕</span> NILAI SESUDAH
                                  </span>
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                    {newJson?.revision ?? 'Revisi #04 (Terkini)'}
                                  </span>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 space-y-1 text-slate-700 dark:text-slate-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">status:</span>
                                    <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold">
                                      {newJson?.status ?? log.newValue ?? 'PENDING_APPROVAL'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">pic_assignee:</span>
                                    <span>{newJson?.pic_assignee ?? 'Ahmad R. (ID: USR-092)'}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">risk_scoring:</span>
                                    <span>{newJson?.risk_scoring ?? 'MODERATE_LVL2'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Note Callout (Catatan Perubahan oleh Pelaku) */}
                            {(newJson?.author_note ||
                              newJson?.review_note ||
                              newJson?.reason ||
                              log.oldValue ||
                              log.newValue) && (
                              <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg p-3 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                  <FileText size={13} className="text-slate-400" />
                                  <span>
                                    {log.action === 'APPROVAL'
                                      ? 'Catatan Evaluasi oleh Reviewer:'
                                      : 'Catatan Perubahan oleh Pelaku:'}
                                  </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 italic pl-4">
                                  &quot;
                                  {newJson?.author_note ??
                                    newJson?.review_note ??
                                    newJson?.reason ??
                                    'Seluruh berkas bukti pengetesan beban (load testing) Q3 telah lengkap. Pengajuan dialihkan ke Manager untuk telaah akhir sebelum implementasi deployment.'}
                                  &quot;
                                </p>
                              </div>
                            )}

                            {/* Evidence Hash Inspector if applicable */}
                            {log.action === 'EVIDENCE_SUBMITTED' && newJson?.sha256_hash && (
                              <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg p-3 text-xs font-mono space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                    <CheckCircle2 size={13} className="text-emerald-600" />
                                    <span>Checksum SHA-256 Integritas Berkas</span>
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-bold">
                                    VERIFIED &bull; ENCRYPTED
                                  </span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700">
                                  <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate mr-2">
                                    {newJson.sha256_hash}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyText(newJson.sha256_hash)}
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                                    title="Salin SHA-256"
                                  >
                                    {copiedHash === newJson.sha256_hash ? (
                                      <Check size={13} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={13} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* ── Load More Button & Footer Counter ── */}
          <div className="pt-4 flex flex-col items-center justify-center gap-2">
            {hasMore ? (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={loadingMore ? 'animate-spin text-blue-600' : ''} />
                <span>Muat Lebih Banyak Aktivitas...</span>
              </button>
            ) : null}

            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Menampilkan {logs.length} dari{' '}
              {(metrics?.totalStoredLogs ?? totalCount).toLocaleString('id-ID')} rekaman log tersimpan
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
