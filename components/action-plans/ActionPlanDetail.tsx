'use client'

import { useState } from 'react'
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

export function ActionPlanDetail({
  actionPlan,
  role,
  userId,
  onOpenChange,
  onChanged,
  onEdit,
}: {
  actionPlan: ActionPlan | null
  role: Role
  userId: string
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  onEdit: () => void
}) {
  const [tab, setTab] = useState<Tab>('work')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [presetReview, setPresetReview] = useState<PresetReview>('COMPLETE')

  if (!actionPlan) return null

  const ap = actionPlan
  const isOwner = ap.picId === userId
  const editableChecklist =
    isOwner && ['NOT_STARTED', 'IN_PROGRESS', 'EVIDENCE_REQUIRED'].includes(ap.status)

  const canStart =
    isOwner &&
    STATUS_TRANSITIONS[ap.status as keyof typeof STATUS_TRANSITIONS]?.includes('IN_PROGRESS') &&
    ['NOT_STARTED', 'REJECTED', 'OVERDUE'].includes(ap.status)
  const canSubmit = isOwner && ['IN_PROGRESS', 'EVIDENCE_REQUIRED'].includes(ap.status)
  // Logika sama seperti lib/rbac.ts canReviewActionPlan — diinline di sini (bukan diimpor)
  // karena file ini 'use client', dan lib/rbac.ts menarik lib/prisma.ts (driver pg,
  // node-only) yang gagal di-bundle untuk client. Server tetap sumber kebenaran final.
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

  const breadcrumb = ap.task?.project?.name
    ? ['Projects', ap.task.project.name, ap.code]
    : ['Personal', ap.code]

  const workBadge =
    ap.checklistTotal > 0 ? `${ap.checklistDone}/${ap.checklistTotal}` : '0'

  return (
    <DialogPrimitive.Root open={!!actionPlan} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px]" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[580px] flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right">
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Target className="h-3.5 w-3.5" /> Governed Outcome KPI
              </p>
              <p className="mt-1.5 text-sm text-slate-800 dark:text-slate-100">{ap.outcomeKpi}</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800">
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
                    <ChecklistList actionPlanId={ap.id} editable={editableChecklist} />
                  </div>
                </section>

                {/* Evidence Submission */}
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <FileText className="h-3.5 w-3.5" /> Evidence Submission
                  </h3>
                  <div className="mt-2 space-y-2">
                    {ap.evidenceLink ? (
                      <a
                        href={ap.evidenceLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">
                          {ap.evidenceLink}
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      </a>
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-3 text-sm text-slate-500 dark:text-slate-400">
                        Belum ada bukti yang dikirim.
                      </p>
                    )}
                    {ap.evaluationNote && (
                      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 p-3">
                        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                        <p className="text-sm italic text-slate-600 dark:text-slate-400">
                          “{ap.evaluationNote}” — PIC
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Manager Governance Sign-off */}
                {canReview && (
                  <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Manager Governance Sign-off
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {ap.evaluationNote
                        ? 'PIC sudah menyerahkan bukti. Tinjau sebelum memberi keputusan.'
                        : 'PIC belum menyerahkan bukti — pertimbangkan Minta Revisi.'}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPresetReview('COMPLETE')
                          setReviewOpen(true)
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-green-600 px-2 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Setujui
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPresetReview('EVIDENCE_REQUIRED')
                          setReviewOpen(true)
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-amber-500 px-2 text-xs font-medium text-white hover:bg-amber-600"
                      >
                        Minta Revisi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPresetReview('REJECTED')
                          setReviewOpen(true)
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-red-500 px-2 text-xs font-medium text-white hover:bg-red-600"
                      >
                        Tolak
                      </button>
                    </div>
                  </section>
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
                  onClick={handleStart}
                  disabled={startLoading}
                  className="inline-flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {startLoading ? 'Memproses...' : 'Mulai Kerja'}
                </button>
              )}
              {canSubmit && (
                <button
                  type="button"
                  onClick={() => setSubmitOpen(true)}
                  className="inline-flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                  Submit untuk Review
                </button>
              )}
              {canReview && (
                <button
                  type="button"
                  onClick={() => {
                    setPresetReview('COMPLETE')
                    setReviewOpen(true)
                  }}
                  className="inline-flex h-9 items-center rounded-md bg-indigo-500 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                >
                  Review &amp; Sign-off
                </button>
              )}
            </div>
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