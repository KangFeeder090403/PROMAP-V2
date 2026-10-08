'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Role, ActionPlanStatus, Priority } from '@/lib/generated/prisma/client'
import {
  Calendar,
  Building2,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
  Plus,
  Pencil,
  Search,
  Filter,
  CheckSquare,
  ArrowLeft,
  Activity,
  Layers,
  MoreHorizontal,
  RefreshCw,
  MessageSquare,
  Paperclip,
  UserCheck,
  FolderPlus,
  Radio,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AP_STATUS_STYLE, AP_STATUS_LABEL, AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ActionPlanItem {
  id: string
  title: string
  outcomeKpi: string
  priority: Priority
  status: ActionPlanStatus
  startDate: string
  endDate: string
  pic: {
    id: string
    name: string
  }
  checklists: {
    isDone: boolean
  }[]
}

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
    division: {
      name: string
    } | null
  }
  actionPlans: ActionPlanItem[]
}

interface ActivityLogItem {
  id: string
  action: string
  createdAt: string
  user: {
    id: string
    name: string
  }
  actionPlan: {
    id: string
    title: string
  } | null
}

interface ProjectDetailData {
  project: {
    id: string
    name: string
    description: string | null
    companyId: string
    company?: { id: string; name: string } | null
    divisionId: string | null
    isActive: boolean
    startDate: string | null
    endDate: string | null
    createdAt: string
    division: { id: string; name: string } | null
    createdBy: { id: string; name: string } | null
  }
  metrics: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    overdueTasks: number
  }
  tasks: TaskItem[]
  activityLogs: ActivityLogItem[]
}

export interface ProjectDetailClientProps {
  projectId: string
  currentUserRole: Role
  currentUserId: string
  currentUserDivisionId?: string | null
}

const CAN_MANAGE_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER']

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const AP_STATUS_ICON: Record<string, { icon: LucideIcon; className: string }> = {
  COMPLETE: { icon: CheckCircle2, className: 'text-emerald-500' },
  APPROVED: { icon: CheckCircle2, className: 'text-emerald-500' },
  IN_PROGRESS: { icon: RefreshCw, className: 'text-sky-500' },
  PENDING_APPROVAL: { icon: Clock, className: 'text-indigo-500' },
  OVERDUE: { icon: AlertTriangle, className: 'text-red-500' },
  REJECTED: { icon: AlertTriangle, className: 'text-red-500' },
  EVIDENCE_REQUIRED: { icon: Paperclip, className: 'text-amber-500' },
  NOT_STARTED: { icon: Radio, className: 'text-slate-400' },
}

const ACTIVITY_ICON: Record<string, { icon: LucideIcon; className: string }> = {
  STATUS_CHANGED: { icon: RefreshCw, className: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' },
  EVIDENCE_SUBMITTED: { icon: Paperclip, className: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' },
  COMMENT_ADDED: { icon: MessageSquare, className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  COMMENT_EDITED: { icon: MessageSquare, className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  REASSIGNED: { icon: UserCheck, className: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' },
  CREATED: { icon: FolderPlus, className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  DEFAULT: { icon: Activity, className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

function actionPhrase(action: string): string {
  switch (action) {
    case 'STATUS_CHANGED':
      return 'memperbarui status'
    case 'EVIDENCE_SUBMITTED':
      return 'mengunggah bukti kerja'
    case 'COMMENT_ADDED':
      return 'menambahkan komentar'
    case 'COMMENT_EDITED':
      return 'menyunting komentar'
    case 'REASSIGNED':
      return 'mengalihkan penugasan'
    case 'CREATED':
      return 'membuat'
    default:
      return action.toLowerCase()
  }
}

export function ProjectDetailClient({
  projectId,
  currentUserRole,
  currentUserId,
  currentUserDivisionId,
}: ProjectDetailClientProps) {
  const router = useRouter()
  const [data, setData] = useState<ProjectDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Modals state
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)

  // Tabs: 'tasks' | 'action-plans' | 'timeline'
  const [activeTab, setActiveTab] = useState<'tasks' | 'action-plans' | 'timeline'>('tasks')

  // Expanded Tasks for Accordion
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({})

  // Filters for Tasks tab
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')

  useEffect(() => {
    fetchProject()
  }, [projectId])

  async function fetchProject() {
    try {
      setLoading(true)
      setErrorStatus(null)
      setErrorMessage(null)
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.status === 403) {
        setErrorStatus(403)
        return
      }
      if (res.status === 404) {
        setErrorStatus(404)
        return
      }
      if (!res.ok) {
        throw new Error('Gagal mengambil data project')
      }
      const json: ProjectDetailData = await res.json()
      setData(json)
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }))
  }

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!data?.tasks) return []
    return data.tasks.filter((task) => {
      const matchQuery =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.pic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.pic.division?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchPriority = priorityFilter === 'ALL' || task.priority === priorityFilter
      return matchQuery && matchPriority
    })
  }, [data?.tasks, searchQuery, priorityFilter])

  // Flat Action Plans grouped
  const allActionPlans = useMemo(() => {
    if (!data?.tasks) return []
    return data.tasks.flatMap((t) =>
      t.actionPlans.map((ap) => ({
        ...ap,
        taskTitle: t.title,
        taskId: t.id,
      }))
    )
  }, [data?.tasks])

  const canManage =
    currentUserRole === 'SUPER_ADMIN' ||
    currentUserRole === 'ADMIN_OPERATIONAL' ||
    (currentUserRole === 'MANAGER' &&
      Boolean(data?.project.divisionId && data.project.divisionId === currentUserDivisionId))

  const canManageProject = canManage

  const canCreateTask = currentUserRole !== 'PIC'

  // 1. STATE: LOADING SKELETON
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="flex gap-4">
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          </div>
        </div>
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4"
            ></div>
          ))}
        </div>
        {/* Tabs & Content Skeleton */}
        <div className="h-64 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"></div>
      </div>
    )
  }

  // 2. STATE: PERMISSION DENIED (403)
  if (errorStatus === 403) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Akses Ditolak</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Anda tidak memiliki izin untuk melihat detail project ini.
        </p>
        <Link
          href="/projects"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Project
        </Link>
      </div>
    )
  }

  // 3. STATE: ERROR / NOT FOUND (404 / 500)
  if (errorStatus === 404 || errorMessage) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {errorStatus === 404 ? 'Project Tidak Ditemukan' : 'Gagal Memuat Project'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          {errorStatus === 404
            ? 'Project yang Anda cari tidak ditemukan atau telah dihapus.'
            : errorMessage}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={fetchProject}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            Coba Lagi
          </button>
          <Link
            href="/projects"
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium transition-colors"
          >
            Kembali
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { project, metrics, tasks, activityLogs } = data

  return (
    <div className="space-y-6">
      {/* Eyebrow Navigation / Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Link href="/projects" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Projects
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 dark:text-slate-200 truncate max-w-xs">{project.name}</span>
      </div>

      {/* Project Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                {project.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  project.isActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {project.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            {canManageProject && (
              <button
                type="button"
                onClick={() => setEditProjectOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm"
              >
                <Pencil className="w-4 h-4" />
                Edit Project
              </button>
            )}
            {canCreateTask && (
              <button
                type="button"
                onClick={() => setCreateTaskOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Task Baru
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Meta Badges Row */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-2">
          {project.company?.name && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-slate-400 dark:text-slate-500 font-normal">Perusahaan:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{project.company.name}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
            <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="text-slate-400 dark:text-slate-500 font-normal">Cakupan:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {project.division?.name ? `Divisi ${project.division.name}` : 'Semua Divisi (Lintas Divisi)'}
            </span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-mono">
              {project.startDate ? new Date(project.startDate).toLocaleDateString('id-ID') : '—'}
              {' – '}
              {project.endDate ? new Date(project.endDate).toLocaleDateString('id-ID') : '—'}
            </span>
          </span>

          {project.createdBy && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white uppercase shrink-0">
                {project.createdBy.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w.charAt(0).toUpperCase())
                  .join('')}
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-normal">Dibuat oleh:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{project.createdBy.name}</span>
            </span>
          )}

          {project.isActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold">Aktif (Berjalan)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
              <span>Nonaktif</span>
            </span>
          )}
        </div>
      </div>

      {/* Context Banner PIC */}
      {currentUserRole === 'PIC' && tasks.some((t) => t.pic.id === currentUserId) && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 text-xs text-blue-800 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Anda ditugaskan pada project ini di workspace <strong className="font-semibold">{project.company?.name ?? 'perusahaan'}</strong> dengan <strong className="font-semibold">{tasks.filter((t) => t.pic.id === currentUserId).length} task</strong> yang menjadi tanggung jawab Anda.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className="shrink-0 font-semibold underline hover:text-blue-950 dark:hover:text-blue-100"
          >
            Buka Task Saya
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Task */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Task
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ListTodo className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {metrics.totalTasks}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Semua deliverable inti</p>
        </div>

        {/* Task Selesai */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Task Selesai
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {metrics.completedTasks}
          </div>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {metrics.totalTasks > 0 ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) : 0}% rasio
            tuntas
          </p>
        </div>

        {/* Sedang Berjalan */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sedang Berjalan
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {metrics.inProgressTasks}
          </div>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">Dalam progres aktif</p>
        </div>

        {/* Terlambat */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Terlambat
            </span>
            <div className="w-8 h-8 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {metrics.overdueTasks}
          </div>
          <p className="mt-1 text-xs text-red-500 dark:text-red-400 font-medium">Memerlukan intervensi</p>
        </div>
      </div>

      {/* Tabs Navigation (segmented) */}
      <div className="flex flex-wrap items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm self-start">
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          aria-label="Tab Tasks"
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'tasks'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ListTodo className="h-4 w-4 shrink-0" />
          Tasks ({tasks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('action-plans')}
          aria-label="Tab Action Plans"
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'action-plans'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="h-4 w-4 shrink-0" />
          Action Plans ({allActionPlans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          aria-label="Tab Aktivitas"
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'timeline'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" />
          Aktivitas ({activityLogs.length})
        </button>
      </div>

      {/* TAB CONTENT 1: TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari task, PIC, atau divisi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  aria-label="Filter Prioritas"
                  className="py-1.5 px-2.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Prioritas</option>
                  <option value="HIGH">Tinggi</option>
                  <option value="MEDIUM">Sedang</option>
                  <option value="LOW">Rendah</option>
                </select>
              </div>
            </div>

            {canCreateTask && (
              <button
                type="button"
                onClick={() => setCreateTaskOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shrink-0 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Task
              </button>
            )}
          </div>

          {/* 4. STATE: EMPTY STATE (No tasks at all) */}
          {tasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ListTodo className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Belum ada task di project ini
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Mulai susun pekerjaan dengan membuat task pertama untuk tim Anda.
              </p>
              {canCreateTask && (
                <button
                  type="button"
                  onClick={() => setCreateTaskOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Buat Task Pertama
                </button>
              )}
            </div>
          ) : filteredTasks.length === 0 ? (
            /* 5. STATE: NO RESULTS (Filter / Search yields zero) */
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tidak ada task yang cocok dengan filter atau pencarian Anda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setPriorityFilter('ALL')
                }}
                className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            /* High-density Tasks Table with Accordion */
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/40 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10"></th>
                      <th className="py-3 px-4">Judul Task</th>
                      <th className="py-3 px-4">PIC & Divisi</th>
                      <th className="py-3 px-4">Prioritas</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Tenggat</th>
                      <th className="py-3 px-4 text-center">Action Plans</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredTasks.map((task) => {
                      const isExpanded = !!expandedTaskIds[task.id]
                      const isOverdue =
                        task.endDate &&
                        task.status !== 'COMPLETE' &&
                        task.status !== 'APPROVED' &&
                        new Date(task.endDate) < new Date()

                      return (
                        <Fragment key={task.id}>
                          <tr
                            onClick={() => toggleTaskExpand(task.id)}
                            className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
                          >
                            {/* Col 1: Chevron */}
                            <td className="py-3.5 px-4 w-10 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </td>

                            {/* Col 2: Judul Task */}
                            <td className="py-3.5 px-4 min-w-[220px]">
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                  {task.description}
                                </div>
                              )}
                            </td>

                            {/* Col 3: PIC & Divisi */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                                  {task.pic.name
                                    .split(/\s+/)
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((w) => w.charAt(0).toUpperCase())
                                    .join('')}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                      {task.pic.name}
                                    </span>
                                    {task.pic.id === currentUserId && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shrink-0">
                                        Tugas Anda
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    {task.pic.division?.name || '—'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Col 4: Prioritas */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  AP_PRIORITY_STYLE[task.priority]
                                }`}
                              >
                                {AP_PRIORITY_LABEL[task.priority]}
                              </span>
                            </td>

                            {/* Col 5: Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  AP_STATUS_STYLE[task.status] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {AP_STATUS_LABEL[task.status] || task.status}
                              </span>
                            </td>

                            {/* Col 6: Tenggat */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                              <span
                                className={
                                  isOverdue
                                    ? 'text-red-600 dark:text-red-400 font-semibold'
                                    : 'text-slate-600 dark:text-slate-400'
                                }
                              >
                                {task.endDate
                                  ? new Date(task.endDate).toLocaleDateString('id-ID')
                                  : '—'}
                              </span>
                            </td>

                            {/* Col 7: Action Plans Count */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {task.actionPlans.length} AP
                              </span>
                            </td>

                            {/* Col 8: Aksi */}
                            <td
                              className="py-3.5 px-4 whitespace-nowrap text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                aria-label="Aksi Task"
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Accordion Row: Action Plans inside this task */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 dark:bg-slate-950/50">
                              <td colSpan={8} className="p-0 border-t border-slate-100 dark:border-slate-800/80">
                                <div className="px-12 py-3.5 space-y-2.5">
                                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>Daftar Action Plan ({task.actionPlans.length})</span>
                                    <Link
                                      href={`/board?projectId=${project.id}`}
                                      className="text-blue-600 dark:text-blue-400 hover:underline normal-case text-xs font-medium"
                                    >
                                      Buka di Kanban Board →
                                    </Link>
                                  </div>

                                  {task.actionPlans.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-1 italic">
                                      Belum ada action plan untuk task ini.
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {task.actionPlans.map((ap) => {
                                        const doneChecklist = ap.checklists.filter((c) => c.isDone).length
                                        const totalChecklist = ap.checklists.length

                                        return (
                                          <div
                                            key={ap.id}
                                            className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span
                                                className={`w-2 h-2 rounded-full shrink-0 ${
                                                  ap.status === 'COMPLETE'
                                                    ? 'bg-emerald-500'
                                                    : ap.status === 'IN_PROGRESS'
                                                    ? 'bg-sky-500'
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                              />
                                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                                {ap.title}
                                              </span>
                                              {ap.outcomeKpi && (
                                                <span className="text-slate-400 truncate hidden md:inline">
                                                  — KPI: {ap.outcomeKpi}
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 flex-wrap">
                                              {totalChecklist > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                  <CheckSquare className="w-3.5 h-3.5" />
                                                  {doneChecklist}/{totalChecklist}
                                                </span>
                                              )}
                                              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                                PIC: {ap.pic.name}
                                              </span>
                                              <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                                  AP_STATUS_STYLE[ap.status] || 'bg-slate-100 text-slate-700'
                                                }`}
                                              >
                                                {AP_STATUS_LABEL[ap.status] || ap.status}
                                              </span>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: ALL ACTION PLANS (grouped by parent task) */}
      {activeTab === 'action-plans' && (
        <div className="space-y-4">
          {allActionPlans.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Belum ada Action Plan
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Action Plan dibuat di dalam Task melalui Kanban Board atau halaman Task.
              </p>
              <Link
                href={`/board?projectId=${project.id}`}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors"
              >
                Buka Board
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) =>
                task.actionPlans.length === 0 ? null : (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                  >
                    {/* Group header: parent task */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderPlus className="h-4 w-4 text-blue-500 dark:text-blue-300 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          Task: {task.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium shrink-0">
                          {task.actionPlans.length} Item
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                        PIC: {task.pic.name} ({task.pic.division?.name || '—'})
                      </span>
                    </div>

                    <div className="p-4 flex flex-col gap-2">
                      {task.actionPlans.map((ap) => {
                        const icon = AP_STATUS_ICON[ap.status] ?? AP_STATUS_ICON.NOT_STARTED
                        const Icon = icon.icon
                        const doneChecklist = ap.checklists.filter((c) => c.isDone).length
                        const totalChecklist = ap.checklists.length
                        const isOverdue =
                          ap.endDate &&
                          ap.status !== 'COMPLETE' &&
                          ap.status !== 'APPROVED' &&
                          new Date(ap.endDate) < new Date()

                        return (
                          <div
                            key={ap.id}
                            className="flex items-center justify-between gap-3 p-3 bg-slate-50/60 dark:bg-slate-950/40 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className={`h-4 w-4 shrink-0 ${icon.className}`} />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                  {ap.title}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  Mulai: {formatShortDate(ap.startDate)} –{' '}
                                  {ap.status === 'COMPLETE' || ap.status === 'APPROVED' ? (
                                    <>Selesai: {formatShortDate(ap.endDate)}</>
                                  ) : isOverdue ? (
                                    <span className="text-red-600 dark:text-red-400 font-medium">
                                      Target: {formatShortDate(ap.endDate)}
                                    </span>
                                  ) : (
                                    <>Target: {formatShortDate(ap.endDate)}</>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 flex-wrap">
                              {totalChecklist > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  {doneChecklist}/{totalChecklist}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  AP_STATUS_STYLE[ap.status] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {AP_STATUS_LABEL[ap.status] || ap.status}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: TIMELINE / RIWAYAT AKTIVITAS */}
      {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          {activityLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Belum ada catatan aktivitas di project ini.
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800"></div>
              <div className="flex flex-col gap-6">
                {activityLogs.map((log) => {
                  const act = ACTIVITY_ICON[log.action] ?? ACTIVITY_ICON.DEFAULT
                  const Icon = act.icon
                  return (
                    <div key={log.id} className="relative flex items-start gap-4">
                      <div
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${act.className}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {log.user.name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {actionPhrase(log.action)}
                          </span>
                          {log.actionPlan && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                              <ChevronRight className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-900 dark:text-slate-100">
                                "{log.actionPlan.title}"
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(log.createdAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Project Modal */}
      {canManageProject && (
        <ProjectForm
          open={editProjectOpen}
          onOpenChange={setEditProjectOpen}
          project={{
            id: project.id,
            name: project.name,
            description: project.description,
            companyId: project.companyId,
            divisionId: project.divisionId,
            isActive: project.isActive,
            startDate: project.startDate,
            endDate: project.endDate,
            createdAt: project.createdAt,
          }}
          role={currentUserRole}
          currentUserDivisionId={currentUserDivisionId}
          onSuccess={() => {
            setEditProjectOpen(false)
            fetchProject()
          }}
        />
      )}

      {/* Create Task Modal */}
      {canCreateTask && (
        <CreateTaskModal
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          projectId={project.id}
          companyId={project.companyId}
          projectDivisionId={project.divisionId}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          currentUserDivisionId={currentUserDivisionId}
          onSuccess={() => {
            setCreateTaskOpen(false)
            fetchProject()
          }}
        />
      )}
    </div>
  )
}

/** Modal Create Task Internal */
function CreateTaskModal({
  open,
  onOpenChange,
  projectId,
  companyId,
  projectDivisionId,
  currentUserRole,
  currentUserId,
  currentUserDivisionId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  companyId: string
  projectDivisionId: string | null
  currentUserRole: Role
  currentUserId: string
  currentUserDivisionId?: string | null
  onSuccess: () => void
}) {
  const defaultDivisionId =
    currentUserRole === 'MANAGER'
      ? (currentUserDivisionId || projectDivisionId || '')
      : (projectDivisionId || '')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [divisionId, setDivisionId] = useState<string>(defaultDivisionId)
  const [picId, setPicId] = useState('')

  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; divisionId: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    setStartDate('')
    setEndDate('')
    const targetDivisionId =
      currentUserRole === 'MANAGER'
        ? (currentUserDivisionId || projectDivisionId || '')
        : (projectDivisionId || '')
    setDivisionId(targetDivisionId)
    setPicId('')

    // Fetch Divisions & Users for assignment
    fetch('/api/divisions')
      .then((r) => (r.ok ? r.json() : []))
      .then(setDivisions)
      .catch(() => setDivisions([]))

    fetch('/api/users')
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [open, projectDivisionId, currentUserRole, currentUserDivisionId])

  // Filter PICs based on selected division
  const activeDivisionId =
    currentUserRole === 'MANAGER'
      ? (currentUserDivisionId || projectDivisionId || '')
      : divisionId

  const filteredUsers = useMemo(() => {
    if (!activeDivisionId) return users
    return users.filter((u) => u.divisionId === activeDivisionId)
  }, [users, activeDivisionId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Judul task wajib diisi')
      return
    }
    const targetDivisionId =
      currentUserRole === 'MANAGER'
        ? (currentUserDivisionId || projectDivisionId || undefined)
        : (divisionId || undefined)

    if (!targetDivisionId && currentUserRole !== 'MANAGER') {
      setError('Divisi task wajib dipilih')
      return
    }
    if (!picId) {
      setError('PIC wajib dipilih')
      return
    }

    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          projectId,
          divisionId: targetDivisionId,
          picId,
          priority,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Gagal membuat task')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Tambah Task Baru
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="p-3 text-xs rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="title" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Judul Task <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Implementasi modul pembayaran"
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="desc" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Deskripsi
            </Label>
            <textarea
              id="desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat task..."
              className="w-full text-sm p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Prioritas
              </Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                aria-label="Pilih Prioritas"
                className="w-full h-9 px-2 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HIGH">Tinggi</option>
              </select>
            </div>

            {/* Division dropdown if not locked */}
            {currentUserRole !== 'MANAGER' && (
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Divisi <span className="text-red-500">*</span>
                </Label>
                <select
                  value={divisionId}
                  onChange={(e) => {
                    setDivisionId(e.target.value)
                    setPicId('')
                  }}
                  aria-label="Pilih Divisi"
                  className="w-full h-9 px-2 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">Pilih Divisi...</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              PIC (Person in Charge) <span className="text-red-500">*</span>
            </Label>
            <select
              value={picId}
              onChange={(e) => setPicId(e.target.value)}
              aria-label="Pilih PIC"
              className="w-full h-9 px-2 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="">Pilih PIC...</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Tanggal Mulai
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Tenggat Waktu
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 h-9 text-sm rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 h-9 text-sm rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Task'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
