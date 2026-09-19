'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import {
  ArrowLeft,
  ChevronRight,
  Target,
  CalendarDays,
  UserCheck,
  FileText,
  Paperclip,
  Check,
  Edit2,
  ExternalLink,
  Globe,
  Github,
  AlertTriangle,
  RotateCw,
  Clock,
  ShieldAlert,
  User,
  FolderKanban,
  CheckSquare,
  History,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  AP_STATUS_STYLE,
  AP_STATUS_LABEL,
  AP_PRIORITY_STYLE,
  AP_PRIORITY_LABEL,
} from '@/lib/status-labels'
import { ChecklistList } from '@/components/action-plans/ChecklistList'
import { CommentThread } from '@/components/comments/CommentThread'
import { SubmitDialog } from '@/components/action-plans/SubmitDialog'
import { ReviewDialog } from '@/components/action-plans/ReviewDialog'
import { ReassignDialog } from '@/components/action-plans/ReassignDialog'
import { ActionPlanFormModal } from '@/components/action-plans/ActionPlanFormModal'
import { timeAgo } from '@/lib/date-utils'

interface ActivityLogItem {
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
}

interface ActionPlanDetailData {
  id: string
  code: string
  title: string
  outcomeKpi: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: string
  startDate: string
  endDate: string
  isPersonal: boolean
  evaluationNote: string | null
  evidenceLink: string | null
  reviewNote: string | null
  companyId: string
  divisionId: string | null
  picId: string
  createdAt: string
  updatedAt: string
  pic: {
    id: string
    name: string
    role: string
    email?: string
    supervisor?: {
      id: string
      name: string
      role: string
    } | null
  }
  task?: {
    id: string
    title: string
    project?: {
      id: string
      name: string
    } | null
    createdBy?: {
      id: string
      name: string
      role: string
    } | null
  } | null
  division?: {
    id: string
    name: string
  } | null
  activityLogs?: ActivityLogItem[]
  commentCount: number
  checklistDone: number
  checklistTotal: number
}

interface ActionPlanWorkspaceClientProps {
  actionPlanId: string
  currentUser: {
    id: string
    name: string
    role: Role
    companyId?: string | null
    divisionId?: string | null
  }
}

function classifyEvidence(link: string | null): 'figma' | 'drive' | 'github' | 'general' | 'none' {
  if (!link) return 'none'
  const lower = link.toLowerCase()
  if (lower.includes('figma.com')) return 'figma'
  if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) return 'drive'
  if (lower.includes('github.com')) return 'github'
  return 'general'
}

function EvidenceIcon({ type }: { type: 'figma' | 'drive' | 'github' | 'general' | 'none' }) {
  if (type === 'github') return <Github className="h-4 w-4 text-slate-700 dark:text-slate-300" />
  if (type === 'figma' || type === 'drive' || type === 'general') {
    return <Globe className="h-4 w-4 text-blue-500" />
  }
  return <Paperclip className="h-4 w-4 text-slate-400" />
}

export function ActionPlanWorkspaceClient({
  actionPlanId,
  currentUser,
}: ActionPlanWorkspaceClientProps) {
  const router = useRouter()

  const [ap, setAp] = useState<ActionPlanDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [denied, setDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [submitOpen, setSubmitOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Action button states
  const [startLoading, setStartLoading] = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Inline Evidence Editor
  const [isEditingEvidence, setIsEditingEvidence] = useState(false)
  const [tempEvidenceLink, setTempEvidenceLink] = useState('')
  const [tempEvaluationNote, setTempEvaluationNote] = useState('')
  const [savingEvidence, setSavingEvidence] = useState(false)

  const [checklistCounts, setChecklistCounts] = useState<{ done: number; total: number }>({ done: 0, total: 0 })

  const fetchActionPlan = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    setError(null)
    setNotFound(false)
    setDenied(false)

    try {
      const res = await fetch(`/api/action-plans/${actionPlanId}`)
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (res.status === 403 || res.status === 401) {
        setDenied(true)
        return
      }
      if (!res.ok) {
        setError(`Gagal memuat data (${res.status} ${res.statusText})`)
        return
      }

      const data = await res.json()
      setAp(data)
      setChecklistCounts({ done: data.checklistDone ?? 0, total: data.checklistTotal ?? 0 })
      setTempEvidenceLink(data.evidenceLink || '')
      setTempEvaluationNote(data.evaluationNote || '')
    } catch (err) {
      console.error('[ACTION_PLAN_WORKSPACE_LOAD]', err)
      setError('Terjadi kendala jaringan saat memuat Action Plan.')
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [actionPlanId])

  useEffect(() => {
    fetchActionPlan(true)
  }, [fetchActionPlan])

  // RBAC flags
  const isPIC = ap ? currentUser.id === ap.picId : false
  const isManager = currentUser.role === 'MANAGER'
  const isAdminOps = currentUser.role === 'ADMIN_OPERATIONAL'
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN'
  const canManage = isManager || isAdminOps || isSuperAdmin

  const canStart = isPIC && (ap?.status === 'NOT_STARTED' || ap?.status === 'REJECTED' || ap?.status === 'OVERDUE')
  const canSubmit = isPIC && (ap?.status === 'IN_PROGRESS' || ap?.status === 'EVIDENCE_REQUIRED')
  const canCompleteDirectly = isPIC && ap?.isPersonal && ap?.status === 'IN_PROGRESS'
  const canReview = canManage && ap?.status === 'PENDING_APPROVAL'
  const canReassign =
    canManage &&
    ap?.divisionId !== null &&
    !ap?.isPersonal &&
    ['NOT_STARTED', 'IN_PROGRESS', 'REJECTED'].includes(ap?.status ?? '')
  const canEdit = canManage || isPIC

  const handleStart = async () => {
    if (!ap) return
    setStartLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/action-plans/${ap.id}/start`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setActionError(d.error || 'Gagal memulai pengerjaan')
        return
      }
      await fetchActionPlan()
    } catch {
      setActionError('Terjadi kesalahan jaringan')
    } finally {
      setStartLoading(false)
    }
  }

  const handleCompletePersonal = async () => {
    if (!ap) return
    setCompleteLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/action-plans/${ap.id}/complete`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setActionError(d.error || 'Gagal menyelesaikan Action Plan')
        return
      }
      await fetchActionPlan()
    } catch {
      setActionError('Terjadi kesalahan jaringan')
    } finally {
      setCompleteLoading(false)
    }
  }

  const handleSaveEvidence = async () => {
    if (!ap) return
    setSavingEvidence(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/action-plans/${ap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceLink: tempEvidenceLink.trim() || null,
          evaluationNote: tempEvaluationNote.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setActionError(d.error || 'Gagal memperbarui bukti kerja')
        return
      }
      setIsEditingEvidence(false)
      await fetchActionPlan()
    } catch {
      setActionError('Gagal menyimpan bukti kerja.')
    } finally {
      setSavingEvidence(false)
    }
  }

  // Due date text
  const dueInfo = useMemo(() => {
    if (!ap) return { text: '', isOverdue: false }
    const end = new Date(ap.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { text: `Terlambat ${Math.abs(diffDays)} hari`, isOverdue: true }
    } else if (diffDays === 0) {
      return { text: 'Jatuh tempo hari ini', isOverdue: false }
    } else {
      return { text: `${diffDays} hari tersisa`, isOverdue: false }
    }
  }, [ap])

  // ===== 1. STATE: LOADING SKELETON =====
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0 p-4 sm:p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6" />
            <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6" />
            <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6" />
            <div className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6" />
            <div className="h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6" />
          </div>
        </div>
      </div>
    )
  }

  // ===== 2. STATE: NOT FOUND (404) =====
  if (notFound) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-12 text-center">
        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center justify-center text-slate-400 mb-4">
          <FileText size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Action Plan Tidak Ditemukan
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Action Plan dengan ID ini mungkin sudah dihapus atau tidak pernah terdaftar pada perusahaan Anda.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/action-plans"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Action Plans</span>
          </Link>
        </div>
      </div>
    )
  }

  // ===== 3. STATE: PERMISSION DENIED (403) =====
  if (denied) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-12 text-center">
        <div className="p-4 rounded-full bg-red-50 dark:bg-red-950/40 inline-flex items-center justify-center text-red-500 mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Akses Ditolak
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Anda tidak memiliki hak akses untuk meninjau atau mengedit Action Plan ini sesuai aturan divisi dan role Anda.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/action-plans"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Action Plans</span>
          </Link>
        </div>
      </div>
    )
  }

  // ===== 4. STATE: ERROR DENGAN TOMBOL RETRY =====
  if (error || !ap) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-12 text-center">
        <div className="p-4 rounded-full bg-amber-50 dark:bg-amber-950/40 inline-flex items-center justify-center text-amber-500 mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Terjadi Kesalahan
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {error || 'Gagal memuat rincian Action Plan.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => fetchActionPlan(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <RotateCw size={14} />
            <span>Coba Lagi</span>
          </button>
        </div>
      </div>
    )
  }

  const evidenceType = classifyEvidence(ap.evidenceLink)

  // ===== 5. STATE: FULL WORKSPACE VIEW (2-KOLOM + SIDEBAR) =====
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 min-w-0 p-4 sm:p-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Kembali</span>
          </button>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <Link href="/projects" className="hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[120px]">
            {ap.task?.project?.name ?? 'Workspace'}
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <Link href="/action-plans" className="hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[140px]">
            {ap.task?.title ?? 'Personal'}
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
            {ap.code}
          </span>
        </div>

        {/* Global Toolbar Action */}
        <div className="flex items-center gap-2">
          {canReassign && (
            <button
              type="button"
              onClick={() => setReassignOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <UserCheck size={13} />
              <span>Alihkan PIC</span>
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Edit2 size={13} />
              <span>Edit Action Plan</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="font-semibold hover:underline">
            Tutup
          </button>
        </div>
      )}

      {/* Main 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        {/* KOLOM UTAMA (8 of 12) */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {ap.code}
                </span>
                <StatusBadge status={ap.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${AP_PRIORITY_STYLE[ap.priority]}`}>
                  {AP_PRIORITY_LABEL[ap.priority]}
                </span>
                {ap.isPersonal && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                    Tugas Personal
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                Diperbarui {timeAgo(ap.updatedAt, new Date())}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
              {ap.title}
            </h1>

            {/* Dynamic RBAC Action Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5 border-t border-slate-100 dark:border-slate-800">
              {canStart && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={startLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Check size={14} />
                  <span>{startLoading ? 'Memproses...' : 'Mulai Kerjakan'}</span>
                </button>
              )}
              {canSubmit && (
                <button
                  type="button"
                  onClick={() => setSubmitOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  <CheckSquare size={14} />
                  <span>Submit Bukti Kerja</span>
                </button>
              )}
              {canCompleteDirectly && (
                <button
                  type="button"
                  onClick={handleCompletePersonal}
                  disabled={completeLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Check size={14} />
                  <span>{completeLoading ? 'Menyelesaikan...' : 'Tandai Selesai Langsung'}</span>
                </button>
              )}
              {canReview && (
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  <CheckSquare size={14} />
                  <span>Tinjau &amp; Beri Keputusan</span>
                </button>
              )}
            </div>
          </div>

          {/* Outcome KPI Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              <Target size={16} className="text-blue-600 dark:text-blue-400" />
              <span>Target &amp; Outcome KPI</span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
              {ap.outcomeKpi || 'Tidak ada spesifikasi KPI khusus.'}
            </p>
          </div>

          {/* Execution Milestones Checklist */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                <span>Daftar Checklist Pelaksanaan</span>
                {checklistCounts.total > 0 && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    {checklistCounts.done}/{checklistCounts.total}
                  </span>
                )}
              </div>
            </div>
            <ChecklistList
              actionPlanId={ap.id}
              editable={canEdit}
              onCountChange={(done, total) => {
                setChecklistCounts({ done, total })
              }}
            />
          </div>

          {/* Evidence / Bukti Kerja Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                <Paperclip size={16} className="text-blue-600 dark:text-blue-400" />
                <span>Bukti Kerja &amp; Catatan Evaluasi</span>
              </div>
              {canSubmit && !isEditingEvidence && (
                <button
                  type="button"
                  onClick={() => setIsEditingEvidence(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 size={12} />
                  <span>Ubah Bukti</span>
                </button>
              )}
            </div>

            {isEditingEvidence ? (
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tautan Bukti Kerja (URL)
                  </label>
                  <input
                    type="url"
                    value={tempEvidenceLink}
                    onChange={(e) => setTempEvidenceLink(e.target.value)}
                    placeholder="https://drive.google.com/... atau https://figma.com/..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Evaluasi / Keterangan PIC
                  </label>
                  <textarea
                    rows={3}
                    value={tempEvaluationNote}
                    onChange={(e) => setTempEvaluationNote(e.target.value)}
                    placeholder="Jelaskan ringkas apa saja yang sudah diselesaikan..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingEvidence(false)}
                    className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEvidence}
                    disabled={savingEvidence}
                    className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingEvidence ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {ap.evidenceLink ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <EvidenceIcon type={evidenceType} />
                      <a
                        href={ap.evidenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                      >
                        {ap.evidenceLink}
                      </a>
                    </div>
                    <a
                      href={ap.evidenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada tautan bukti kerja yang diserahkan.</p>
                )}

                {ap.evaluationNote && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      Catatan Penyelesaian dari PIC:
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {ap.evaluationNote}
                    </p>
                  </div>
                )}

                {ap.reviewNote && (
                  <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 space-y-1">
                    <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                      Catatan Peninjauan Manager:
                    </p>
                    <p className="text-xs text-amber-900 dark:text-amber-200 whitespace-pre-line leading-relaxed">
                      {ap.reviewNote}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discussion & Mentions Thread */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <CommentThread
              actionPlanId={ap.id}
              currentUserId={currentUser.id}
              canComment={true}
            />
          </div>
        </div>

        {/* SIDEBAR KANAN (4 of 12) */}
        <div className="lg:col-span-4 space-y-6 min-w-0">
          {/* Card PIC & Supervisor */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <User size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Penanggung Jawab</span>
            </h3>

            {/* PIC Information */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                {ap.pic.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {ap.pic.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  PIC ({ap.pic.role})
                </p>
              </div>
            </div>

            {/* Supervisor / Reviewer Information */}
            {ap.pic.supervisor && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Supervisor Peninjau
                </p>
                <div className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  <UserCheck size={14} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {ap.pic.supervisor.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {ap.pic.supervisor.role}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card Timeline & Tenggat Waktu */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <CalendarDays size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Timeline &amp; Tenggat</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mulai</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(ap.startDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tenggat Waktu</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(ap.endDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              dueInfo.isOverdue
                ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
            }`}>
              <Clock size={13} />
              <span>{dueInfo.text}</span>
            </div>
          </div>

          {/* Card Relasi Induk Task & Proyek */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <FolderKanban size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Relasi Induk</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Proyek</span>
                {ap.task?.project ? (
                  <Link
                    href={`/projects/${ap.task.project.id}`}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline block truncate mt-0.5"
                  >
                    {ap.task.project.name}
                  </Link>
                ) : (
                  <span className="text-slate-500 font-medium">Non-Proyek / Personal</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Induk Task</span>
                {ap.task ? (
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {ap.task.title}
                  </p>
                ) : (
                  <span className="text-slate-500 font-medium">Tugas Mandiri</span>
                )}
              </div>

              {ap.division && (
                <div>
                  <span className="text-slate-400 text-[11px] block">Divisi</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                    {ap.division.name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card Riwayat Status & Activity Logs */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <History size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Histori Aktivitas</span>
            </h3>

            {ap.activityLogs && ap.activityLogs.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {ap.activityLogs.map((log) => (
                  <div key={log.id} className="text-xs space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-none">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {log.user.name}
                      </span>
                      <span>{timeAgo(log.createdAt, new Date())}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    {(log.oldValue || log.newValue) && (
                      <p className="text-[10px] text-slate-400 truncate">
                        {log.oldValue && `${log.oldValue} → `}{log.newValue}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada catatan aktivitas.</p>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Modals */}
      <SubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        actionPlanId={ap.id}
        onSuccess={() => {
          setSubmitOpen(false)
          fetchActionPlan()
        }}
        onConflict={() => {
          setSubmitOpen(false)
          fetchActionPlan()
        }}
      />

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        actionPlanId={ap.id}
        title={ap.title}
        onSuccess={() => {
          setReviewOpen(false)
          fetchActionPlan()
        }}
        onConflict={() => {
          setReviewOpen(false)
          fetchActionPlan()
        }}
      />

      <ReassignDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        actionPlanId={ap.id}
        divisionId={ap.divisionId}
        onSuccess={() => {
          setReassignOpen(false)
          fetchActionPlan()
        }}
        onConflict={() => {
          setReassignOpen(false)
          fetchActionPlan()
        }}
      />

      {editOpen && (
        <ActionPlanFormModal
          open={editOpen}
          onOpenChange={setEditOpen}
          actionPlan={ap as any}
          onSuccess={() => {
            setEditOpen(false)
            fetchActionPlan()
          }}
        />
      )}
    </div>
  )
}
