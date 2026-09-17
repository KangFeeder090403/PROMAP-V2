'use client'

import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import type { Role } from '@/lib/generated/prisma/client'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  X,
  ExternalLink,
  ChevronRight,
  Target,
  CalendarDays,
  UserCheck,
  FileText,
  StickyNote,
  Paperclip,
  Check,
  Edit2,
  Upload,
  Globe,
  Github,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL, AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import { STATUS_TRANSITIONS } from '@/lib/action-plan-status'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { ChecklistList } from '@/components/action-plans/ChecklistList'
import { CommentThread } from '@/components/comments/CommentThread'
import { SubmitDialog } from '@/components/action-plans/SubmitDialog'
import { ReviewDialog } from '@/components/action-plans/ReviewDialog'
import { ReassignDialog } from '@/components/action-plans/ReassignDialog'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_OPERATIONAL: 'Admin Operasional',
  MANAGER: 'Manager',
  PIC: 'PIC',
  GUEST: 'Guest',
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} hari lalu`
  return new Date(value).toLocaleDateString('id-ID')
}

function dueText(endDate: string, status: string) {
  if (status === 'COMPLETE') return 'Selesai'
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return `Terlambat ${Math.abs(days)} hari`
  if (days === 0) return 'Tenggat hari ini'
  return `Sisa ${days} hari`
}

function initials(name?: string | null) {
  return (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

type Tab = 'work' | 'activity'
type PresetReview = 'COMPLETE' | 'REJECTED' | 'EVIDENCE_REQUIRED'

function getServiceIcon(url: string) {
  const lower = url.toLowerCase()
  if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
    return <FileText className="h-4 w-4 shrink-0 text-blue-500" />
  }
  if (lower.includes('figma.com')) {
    return <Target className="h-4 w-4 shrink-0 text-purple-500" />
  }
  if (lower.includes('github.com') || lower.includes('gitlab.com')) {
    return <Github className="h-4 w-4 shrink-0 text-slate-800 dark:text-slate-200" />
  }
  return <Globe className="h-4 w-4 shrink-0 text-blue-500" />
}

function computeDetailPermissions(ap: ActionPlan, userId: string, role: Role) {
  const isOwner = ap.picId === userId
  const isPersonal = ap.isPersonal || !ap.taskId
  const editableChecklist =
    isOwner && ['NOT_STARTED', 'IN_PROGRESS', 'EVIDENCE_REQUIRED'].includes(ap.status)

  const canStart =
    isOwner &&
    STATUS_TRANSITIONS[ap.status as keyof typeof STATUS_TRANSITIONS]?.includes('IN_PROGRESS') &&
    ['NOT_STARTED', 'REJECTED', 'OVERDUE'].includes(ap.status)
  const canSubmit = !isPersonal && isOwner && ['IN_PROGRESS', 'EVIDENCE_REQUIRED'].includes(ap.status)
  const canCompleteDirectly =
    isOwner &&
    isPersonal &&
    ['NOT_STARTED', 'IN_PROGRESS', 'EVIDENCE_REQUIRED', 'REJECTED', 'OVERDUE'].includes(ap.status)
  const canReview =
    !isOwner &&
    ap.status === 'PENDING_APPROVAL' &&
    (role === 'SUPER_ADMIN' ||
      role === 'ADMIN_OPERATIONAL' ||
      (role === 'MANAGER' && ap.divisionId !== null))
  const canReassign =
    ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'].includes(role) &&
    ap.divisionId !== null &&
    ['NOT_STARTED', 'IN_PROGRESS', 'REJECTED'].includes(ap.status)

  return {
    isOwner,
    isPersonal,
    editableChecklist,
    canStart,
    canSubmit,
    canCompleteDirectly,
    canReview,
    canReassign,
  }
}

interface EvidenceContentDisplayProps {
  evidenceLink: string | null
  evaluationNote: string | null
}

function EvidenceContentDisplay({ evidenceLink, evaluationNote }: Readonly<EvidenceContentDisplayProps>) {
  return (
    <>
      {evidenceLink ? (
        <a
          href={evidenceLink}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {getServiceIcon(evidenceLink)}
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">
            {evidenceLink}
          </span>
          <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        </a>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-3 text-sm text-slate-500 dark:text-slate-400">
          Belum ada bukti yang dikirim.
        </p>
      )}
      {evaluationNote && (
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 p-3">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <p className="text-sm italic text-slate-600 dark:text-slate-400">
            “{evaluationNote}” — PIC
          </p>
        </div>
      )}
    </>
  )
}

interface ManagerReviewSectionProps {
  evaluationNote: string | null
  onReview: (action: PresetReview) => void
}

function ManagerReviewSection({ evaluationNote, onReview }: Readonly<ManagerReviewSectionProps>) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Persetujuan &amp; Keputusan Manager
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {evaluationNote
          ? 'PIC sudah menyerahkan bukti. Tinjau sebelum memberi keputusan.'
          : 'PIC belum menyerahkan bukti — pertimbangkan Minta Revisi.'}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onReview('COMPLETE')}
          className="inline-flex h-9 items-center justify-center rounded-md bg-green-600 px-2 text-xs font-medium text-white hover:bg-green-700"
        >
          Setujui
        </button>
        <button
          type="button"
          onClick={() => onReview('EVIDENCE_REQUIRED')}
          className="inline-flex h-9 items-center justify-center rounded-md bg-amber-500 px-2 text-xs font-medium text-white hover:bg-amber-600"
        >
          Minta Revisi
        </button>
        <button
          type="button"
          onClick={() => onReview('REJECTED')}
          className="inline-flex h-9 items-center justify-center rounded-md bg-red-500 px-2 text-xs font-medium text-white hover:bg-red-600"
        >
          Tolak
        </button>
      </div>
    </section>
  )
}

interface DetailFooterActionsProps {
  isOwner: boolean
  canStart: boolean
  canCompleteDirectly: boolean
  canSubmit: boolean
  canReview: boolean
  startLoading: boolean
  completeLoading: boolean
  onEdit: () => void
  onStart: () => void
  onCompletePersonal: () => void
  onSubmit: () => void
  onReview: () => void
}

function DetailFooterActions({
  isOwner,
  canStart,
  canCompleteDirectly,
  canSubmit,
  canReview,
  startLoading,
  completeLoading,
  onEdit,
  onStart,
  onCompletePersonal,
  onSubmit,
  onReview,
}: Readonly<DetailFooterActionsProps>) {
  return (
    <div className="flex items-center gap-2">
      <DialogPrimitive.Close
        aria-label="Tutup"
        className="inline-flex h-9 items-center rounded-md border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        Tutup
      </DialogPrimitive.Close>
      {isOwner && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center rounded-md border border-slate-200 dark:border-slate-800 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Edit
        </button>
      )}
      {canStart && (
        <button
          type="button"
          onClick={onStart}
          disabled={startLoading}
          className="inline-flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
        >
          {startLoading ? 'Memproses...' : 'Mulai Kerjakan'}
        </button>
      )}
      {canCompleteDirectly && (
        <button
          type="button"
          onClick={onCompletePersonal}
          disabled={completeLoading}
          className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {completeLoading ? 'Memproses...' : 'Tandai Selesai'}
        </button>
      )}
      {canSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          Submit untuk Review
        </button>
      )}
      {canReview && (
        <button
          type="button"
          onClick={onReview}
          className="inline-flex h-9 items-center rounded-md bg-indigo-500 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
        >
          Tinjau &amp; Beri Keputusan
        </button>
      )}
    </div>
  )
}

export function ActionPlanDetail({
  actionPlan,
  role,
  userId,
  onOpenChange,
  onChanged,
  onEdit,
}: Readonly<{
  actionPlan: ActionPlan | null
  role: Role
  userId: string
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  onEdit: () => void
}>) {
  const [tab, setTab] = useState<Tab>('work')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [presetReview, setPresetReview] = useState<PresetReview>('COMPLETE')
  const [checklistCounts, setChecklistCounts] = useState<{ id: string; done: number; total: number } | null>(null)
  const [isEditingEvidence, setIsEditingEvidence] = useState(false)
  const [inlineEvidence, setInlineEvidence] = useState('')
  const [inlineNote, setInlineNote] = useState('')
  const [savingEvidence, setSavingEvidence] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // ponytail: enter via GSAP, exit via Radix data-[state=closed]
  useGSAP(() => {
    if (!actionPlan) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (overlayRef.current) {
        gsap.from(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power2.out' })
      }
      if (panelRef.current) {
        gsap.from(panelRef.current, { x: 32, opacity: 0, duration: 0.38, ease: 'power3.out' })
      }
      gsap.from('[data-drawer-section]', {
        y: 10,
        opacity: 0,
        duration: 0.35,
        stagger: 0.05,
        delay: 0.1,
        ease: 'power2.out',
        clearProps: 'all',
      })
    })
    return () => mm.revert()
  }, { scope: panelRef, dependencies: [actionPlan?.id] })

  if (!actionPlan) return null

  const ap = actionPlan
  const currentCounts = checklistCounts?.id === ap.id ? checklistCounts : null
  const doneCount = currentCounts?.done ?? ap.checklistDone
  const totalCount = currentCounts?.total ?? ap.checklistTotal

  const {
    isOwner,
    isPersonal,
    editableChecklist,
    canStart,
    canSubmit,
    canCompleteDirectly,
    canReview,
    canReassign,
  } = computeDetailPermissions(ap, userId, role)

  async function handleStart() {
    setActionError('')
    setStartLoading(true)
    const res = await fetch(`/api/action-plans/${ap.id}/start`, { method: 'POST' })
    setStartLoading(false)
    if (res.status === 409) {
      setConflict(true)
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setActionError(data.error || 'Gagal memulai Action Plan')
      return
    }
    onChanged()
  }

  async function handleSaveInlineEvidence() {
    if (!inlineEvidence.trim() && !inlineNote.trim()) {
      setIsEditingEvidence(false)
      return
    }
    setSavingEvidence(true)
    try {
      const res = await fetch(`/api/action-plans/${ap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceLink: inlineEvidence.trim() || null,
          evaluationNote: inlineNote.trim() || null,
        }),
      })
      if (res.ok) {
        setIsEditingEvidence(false)
        onChanged()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingEvidence(false)
    }
  }

  async function handleCompletePersonal() {
    setActionError('')
    setCompleteLoading(true)
    const res = await fetch(`/api/action-plans/${ap.id}/complete`, { method: 'POST' })
    setCompleteLoading(false)
    if (res.status === 409) {
      setConflict(true)
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setActionError(data.error || 'Gagal menyelesaikan Action Plan')
      return
    }
    onChanged()
  }

  const breadcrumb = ap.task?.project?.name
    ? ['Projects', ap.task.project.name, ap.code]
    : ['Personal', ap.code]

  const workBadge = totalCount > 0 ? `${doneCount}/${totalCount}` : '0'

  return (
    <DialogPrimitive.Root open={!!actionPlan} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay ref={overlayRef} className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px]" />
        <DialogPrimitive.Content ref={panelRef} className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[580px] flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right">
          {/* ===== Header ===== */}
          <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                {breadcrumb.map((part, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />}
                    <span className={i === breadcrumb.length - 1 ? 'font-medium text-slate-700 dark:text-slate-300' : ''}>
                      {part}
                    </span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {ap.evidenceLink && (
                  <a
                    href={ap.evidenceLink}
                    target="_blank"
                    rel="noreferrer"
                    title="Buka bukti di tab baru"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <DialogPrimitive.Close
                  aria-label="Tutup"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            <div className="mt-2 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-50">{ap.title}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{ap.code}</span>
                  <StatusBadge status={ap.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
                  <span className="text-xs text-slate-400 dark:text-slate-500">Diperbarui {timeAgo(ap.updatedAt)}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Status hanya bergerak lewat alur Mulai Kerja → Submit → Review Manager.
                </p>
              </div>
            </div>
          </div>

          {/* ===== Body ===== */}
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {(conflict || actionError) && (
              <div className="space-y-2">
                {conflict && (
                  <div className="flex items-center justify-between rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    Status sudah berubah, silakan refresh
                    <button
                      type="button"
                      onClick={() => {
                        setConflict(false)
                        onChanged()
                      }}
                      className="font-medium underline"
                    >
                      Refresh
                    </button>
                  </div>
                )}
                {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
              </div>
            )}

            {/* Context: PIC / Priority & Due */}
            <div data-drawer-section className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <UserCheck className="h-3.5 w-3.5" /> PIC Pengelola
                </p>
                <div className="mt-2 flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    {initials(ap.pic?.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      {ap.pic?.name ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {ap.pic ? ROLE_LABEL[ap.pic.role] ?? ap.pic.role : ''}
                    </p>
                  </div>
                </div>
                {canReassign && (
                  <button
                    type="button"
                    onClick={() => setReassignOpen(true)}
                    className="mt-2 inline-flex h-7 items-center rounded-md border border-slate-200 dark:border-slate-800 px-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Reassign
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" /> Prioritas &amp; Deadline
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusBadge status={ap.priority} styleMap={AP_PRIORITY_STYLE} labelMap={AP_PRIORITY_LABEL} />
                  <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                    {new Date(ap.endDate).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <p
                  className={`mt-1.5 text-xs font-medium ${
                    dueText(ap.endDate, ap.status).startsWith('Terlambat')
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {dueText(ap.endDate, ap.status)}
                </p>
              </div>
            </div>

            {/* Governed Outcome KPI */}
            <div data-drawer-section className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Target className="h-3.5 w-3.5" /> Governed Outcome KPI
              </p>
              <p className="mt-1.5 text-sm text-slate-800 dark:text-slate-100">{ap.outcomeKpi}</p>
            </div>

            {/* Tabs */}
            <div data-drawer-section className="border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTab('work')}
                  className={`inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors ${
                    tab === 'work'
                      ? 'border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Work &amp; Evidence
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                      tab === 'work'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {workBadge}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('activity')}
                  className={`inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors ${
                    tab === 'activity'
                      ? 'border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Activity &amp; Discussion
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                      tab === 'activity'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {ap.commentCount}
                  </span>
                </button>
              </div>
            </div>

            {tab === 'work' && (
              <div className="space-y-5">
                {/* Execution Milestones */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Execution Milestones
                  </h3>
                  <div className="mt-2">
                    <ChecklistList
                      actionPlanId={ap.id}
                      editable={editableChecklist}
                      onCountChange={(d, t) => {
                        setChecklistCounts({ id: ap.id, done: d, total: t })
                      }}
                    />
                  </div>
                </section>

                {/* Evidence Submission */}
                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <FileText className="h-3.5 w-3.5" /> Evidence Submission
                    </h3>
                    {isOwner && ['IN_PROGRESS', 'EVIDENCE_REQUIRED'].includes(ap.status) && !isEditingEvidence && (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineEvidence(ap.evidenceLink || '')
                          setInlineNote(ap.evaluationNote || '')
                          setIsEditingEvidence(true)
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Edit2 className="h-3 w-3" />
                        {ap.evidenceLink || ap.evaluationNote ? 'Ubah Bukti' : '+ Tambah Bukti'}
                      </button>
                    )}
                  </div>

                  <div className="mt-2 space-y-2">
                    {isEditingEvidence ? (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900/60 dark:bg-blue-950/20 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                            Tautan Dokumen / Cloud Drive
                          </label>
                          <div className="relative mt-1">
                            <input
                              type="url"
                              value={inlineEvidence}
                              onChange={(e) => setInlineEvidence(e.target.value)}
                              placeholder="https://drive.google.com/... atau https://figma.com/..."
                              className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                            Catatan Bukti / Hasil Kerja (Opsional)
                          </label>
                          <textarea
                            rows={2}
                            value={inlineNote}
                            onChange={(e) => setInlineNote(e.target.value)}
                            placeholder="Jelaskan ringkas deliverables atau catatan penting..."
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={savingEvidence}
                            onClick={() => setIsEditingEvidence(false)}
                            className="rounded px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={savingEvidence}
                            onClick={handleSaveInlineEvidence}
                            className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                            {savingEvidence ? 'Menyimpan...' : 'Simpan Bukti'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <EvidenceContentDisplay
                        evidenceLink={ap.evidenceLink}
                        evaluationNote={ap.evaluationNote}
                      />
                    )}
                  </div>
                </section>

                {/* Keputusan Manager */}
                {canReview && (
                  <ManagerReviewSection
                    evaluationNote={ap.evaluationNote}
                    onReview={(preset) => {
                      setPresetReview(preset)
                      setReviewOpen(true)
                    }}
                  />
                )}
              </div>
            )}

            {tab === 'activity' && (
              <CommentThread actionPlanId={ap.id} />
            )}
          </div>

          {/* ===== Sticky footer ===== */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
            <span className="text-xs text-slate-400 dark:text-slate-500">Terakhir diperbarui {timeAgo(ap.updatedAt)}</span>
            <DetailFooterActions
              isOwner={isOwner}
              canStart={canStart}
              canCompleteDirectly={canCompleteDirectly}
              canSubmit={canSubmit}
              canReview={canReview}
              startLoading={startLoading}
              completeLoading={completeLoading}
              onEdit={onEdit}
              onStart={handleStart}
              onCompletePersonal={handleCompletePersonal}
              onSubmit={() => setSubmitOpen(true)}
              onReview={() => {
                setPresetReview('COMPLETE')
                setReviewOpen(true)
              }}
            />
          </div>

          <SubmitDialog
            open={submitOpen}
            onOpenChange={setSubmitOpen}
            actionPlanId={ap.id}
            onSuccess={() => {
              setSubmitOpen(false)
              onChanged()
            }}
            onConflict={() => {
              setSubmitOpen(false)
              setConflict(true)
            }}
          />

          <ReviewDialog
            open={reviewOpen}
            onOpenChange={setReviewOpen}
            actionPlanId={ap.id}
            title={ap.title}
            presetAction={presetReview}
            onSuccess={() => {
              setReviewOpen(false)
              onChanged()
            }}
            onConflict={() => {
              setReviewOpen(false)
              setConflict(true)
            }}
          />

          <ReassignDialog
            open={reassignOpen}
            onOpenChange={setReassignOpen}
            actionPlanId={ap.id}
            divisionId={ap.divisionId}
            onSuccess={() => {
              setReassignOpen(false)
              onChanged()
            }}
            onConflict={() => {
              setReassignOpen(false)
              setConflict(true)
            }}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}