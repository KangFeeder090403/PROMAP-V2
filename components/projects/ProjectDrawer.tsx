'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderKanban,
  Layers,
  ListTodo,
  Maximize2,
  Pencil,
  RotateCcw,
  User,
  X,
} from 'lucide-react'
import type { Role, Priority, ActionPlanStatus } from '@/lib/generated/prisma/client'
import { timeAgo } from '@/lib/date-utils'

interface TaskItem {
  id: string
  title: string
  description: string | null
  priority: Priority
  status: ActionPlanStatus
  startDate: string | null
  endDate: string | null
  pic: {
    id: string
    name: string
    division?: { name: string } | null
  } | null
  actionPlans?: {
    id: string
    title: string
    status: string
  }[]
}

interface ProjectDetailData {
  project: {
    id: string
    name: string
    description: string | null
    companyId: string
    divisionId: string | null
    isActive: boolean
    startDate: string | null
    endDate: string | null
    createdAt: string
    company?: { id: string; name: string } | null
    division?: { id: string; name: string } | null
    createdBy?: { id: string; name: string } | null
  }
  metrics: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    overdueTasks: number
  }
  tasks: TaskItem[]
  activityLogs: {
    id: string
    action: string
    newValue: string | null
    createdAt: string
    user: { id: string; name: string }
    actionPlan?: { id: string; title: string } | null
  }[]
}

type TabKey = 'tasks' | 'overview' | 'activity'

function dueText(endDate: string | null, isFinished: boolean) {
  if (!endDate) return 'Tenggat belum diatur'
  if (isFinished) return 'Selesai'
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return `Terlambat ${Math.abs(days)} hari`
  if (days === 0) return 'Tenggat hari ini'
  return `Sisa ${days} hari`
}

export function ProjectDrawer({
  projectId,
  role,
  open,
  onOpenChange,
  onEdit,
}: {
  projectId: string | null
  role: Role
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (project: ProjectDetailData['project']) => void
}) {
  const [data, setData] = useState<ProjectDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('tasks')
  const [now] = useState(() => new Date())

  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const canManage = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'].includes(role)

  // Fetch detail proyek saat drawer dibuka
  useEffect(() => {
    if (!open || !projectId) {
      setData(null)
      setError(null)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)
    setActiveTab('tasks')

    fetch(`/api/projects/${projectId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Gagal memuat detail proyek')
        }
        return res.json()
      })
      .then((json: ProjectDetailData) => {
        if (isMounted) setData(json)
      })
      .catch((err: Error) => {
        if (isMounted) setError(err.message)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, projectId])

  // GSAP animation matching ActionPlanDetail
  useGSAP(
    () => {
      if (!open) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (overlayRef.current) {
          gsap.from(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power2.out' })
        }
        if (panelRef.current) {
          gsap.from(panelRef.current, { x: 36, opacity: 0, duration: 0.35, ease: 'power3.out' })
        }
        gsap.from('[data-drawer-elem]', {
          y: 8,
          opacity: 0,
          duration: 0.3,
          stagger: 0.04,
          delay: 0.08,
          ease: 'power2.out',
          clearProps: 'all',
        })
      })
      return () => mm.revert()
    },
    { scope: panelRef, dependencies: [open, projectId] }
  )

  const project = data?.project
  const metrics = data?.metrics
  const tasks = data?.tasks ?? []
  const progressPct =
    metrics && metrics.totalTasks > 0
      ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
      : 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          ref={overlayRef}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        />

        <DialogPrimitive.Content
          ref={panelRef}
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-all sm:max-w-2xl focus:outline-none"
        >
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <FolderKanban className="h-4 w-4 text-blue-500" />
              <span>Inspeksi Cepat Inisiatif Proyek</span>
            </div>

            <div className="flex items-center gap-1">
              {projectId && (
                <Link
                  href={`/projects/${projectId}`}
                  title="Buka Halaman Penuh (Full Workspace)"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <Maximize2 className="h-4 w-4" />
                </Link>
              )}
              <DialogPrimitive.Close
                aria-label="Tutup"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex-1 p-6 space-y-5 animate-pulse">
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              <div className="space-y-3 pt-4">
                <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded" />
                <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded" />
                <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded" />
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-3 rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 mb-3">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Gagal Memuat Detail
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (projectId) {
                    setLoading(true)
                    setError(null)
                    fetch(`/api/projects/${projectId}`)
                      .then((r) => r.json())
                      .then(setData)
                      .catch((e) => setError(e.message))
                      .finally(() => setLoading(false))
                  }
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Coba Lagi
              </button>
            </div>
          )}

          {/* Loaded Content */}
          {!loading && !error && project && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header Title & Badges */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3" data-drawer-elem>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <DialogPrimitive.Title className="text-lg font-bold text-slate-900 dark:text-slate-50 leading-tight">
                      {project.name}
                    </DialogPrimitive.Title>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          project.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            project.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {project.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>

                      {project.division && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                          <Building2 className="h-3 w-3" />
                          {project.division.name}
                        </span>
                      )}

                      {project.company && role === 'SUPER_ADMIN' && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {project.company.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                      {progressPct}%
                    </span>
                    <p className="text-[11px] text-slate-400">Total Progres</p>
                  </div>
                </div>

                {/* Progress Bar Multi-Segment */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                    {metrics && metrics.overdueTasks > 0 && (
                      <div
                        className="h-full bg-red-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            Math.round((metrics.overdueTasks / metrics.totalTasks) * 100),
                            100 - progressPct
                          )}%`,
                        }}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <div className="flex items-center gap-3">
                      <span>{metrics?.completedTasks ?? 0} dari {metrics?.totalTasks ?? 0} task selesai</span>
                      {metrics && metrics.overdueTasks > 0 && (
                        <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {metrics.overdueTasks} telat
                        </span>
                      )}
                    </div>
                    <span>{dueText(project.endDate, progressPct === 100)}</span>
                  </div>
                </div>
              </div>

              {/* Tabs Bar */}
              <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900 shrink-0" data-drawer-elem>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold transition-colors ${
                    activeTab === 'tasks'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <ListTodo className="h-4 w-4" />
                  <span>Daftar Task ({tasks.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold transition-colors ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span>Ringkasan &amp; Sasaran</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold transition-colors ${
                    activeTab === 'activity'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Aktivitas ({data.activityLogs.length})</span>
                </button>
              </div>

              {/* Tab Content Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* TAB 1: TASKS */}
                {activeTab === 'tasks' && (
                  <div className="space-y-3" data-drawer-elem>
                    {tasks.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Belum ada task dalam inisiatif ini
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Buka halaman penuh untuk menambahkan sasaran kerja baru.
                        </p>
                      </div>
                    ) : (
                      tasks.map((t) => {
                        const isDone = t.status === 'COMPLETE' || t.status === 'APPROVED'
                        return (
                          <div
                            key={t.id}
                            className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 bg-white dark:bg-slate-900/60 transition-colors space-y-2 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {isDone ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                                )}
                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate" title={t.title}>
                                  {t.title}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                                  t.priority === 'HIGH'
                                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                    : t.priority === 'MEDIUM'
                                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {t.priority}
                              </span>
                            </div>

                            {t.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {t.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-3">
                                {t.pic && (
                                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                    <User className="h-3 w-3 text-slate-400" />
                                    {t.pic.name}
                                  </span>
                                )}
                                {t.actionPlans && t.actionPlans.length > 0 && (
                                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                    <Layers className="h-3 w-3" />
                                    {t.actionPlans.length} Action Plan
                                  </span>
                                )}
                              </div>

                              {t.endDate && (
                                <span className="font-mono text-[10px]">
                                  Target: {new Date(t.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {/* TAB 2: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-4" data-drawer-elem>
                    <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Deskripsi &amp; Sasaran Utama
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {project.description || 'Tidak ada catatan deskripsi tambahan untuk inisiatif ini.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <span className="text-[11px] text-slate-400 block mb-1">Periode Pelaksanaan</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span>
                            {project.startDate
                              ? new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}{' '}
                            s/d{' '}
                            {project.endDate
                              ? new Date(project.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <span className="text-[11px] text-slate-400 block mb-1">Inisiator Proyek</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{project.createdBy?.name ?? 'Sistem ProMaP'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ACTIVITY */}
                {activeTab === 'activity' && (
                  <div className="space-y-3" data-drawer-elem>
                    {data.activityLogs.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        Belum ada riwayat aktivitas yang tercatat.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.activityLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {log.user.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {timeAgo(log.createdAt, now)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              {log.action}
                              {log.actionPlan && ` pada "${log.actionPlan.title}"`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
                <DialogPrimitive.Close
                  type="button"
                  className="px-4 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Tutup
                </DialogPrimitive.Close>

                <div className="flex items-center gap-2">
                  {canManage && onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false)
                        onEdit(project)
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit Inisiatif</span>
                    </button>
                  )}

                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 px-4 h-9 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors shadow-xs"
                  >
                    <span>Buka Halaman Penuh</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
