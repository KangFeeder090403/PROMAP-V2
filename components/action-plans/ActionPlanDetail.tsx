'use client'

import { useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL } from '@/lib/status-labels'
import { STATUS_TRANSITIONS } from '@/lib/action-plan-status'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { ChecklistList } from '@/components/action-plans/ChecklistList'
import { CommentThread } from '@/components/comments/CommentThread'
import { SubmitDialog } from '@/components/action-plans/SubmitDialog'
import { ReviewDialog } from '@/components/action-plans/ReviewDialog'
import { ReassignDialog } from '@/components/action-plans/ReassignDialog'

type Tab = 'detail' | 'checklist' | 'comments'

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
  const [tab, setTab] = useState<Tab>('detail')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [conflict, setConflict] = useState(false)

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
      (role === 'ADMIN_OPERATIONAL') ||
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

  return (
    <Dialog open={!!actionPlan} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900">{ap.title}</DialogTitle>
        </DialogHeader>

        {conflict && (
          <div className="flex items-center justify-between rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
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
        {actionError && <p className="text-sm text-red-600">{actionError}</p>}

        <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
          {(['detail', 'checklist', 'comments'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`text-sm font-medium pb-1 ${
                tab === t ? 'text-blue-600 border-b-2 border-blue-500' : 'text-slate-500'
              }`}
            >
              {t === 'detail' ? 'Detail' : t === 'checklist' ? 'Checklist' : 'Komentar'}
            </button>
          ))}
        </div>

        <div className="min-h-[200px]">
          {tab === 'detail' && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge status={ap.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
              </div>
              <div>
                <span className="font-medium text-slate-700">Outcome KPI: </span>
                <span className="text-slate-600">{ap.outcomeKpi}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Periode: </span>
                <span className="text-slate-600">
                  {new Date(ap.startDate).toLocaleDateString('id-ID')} —{' '}
                  {new Date(ap.endDate).toLocaleDateString('id-ID')}
                </span>
              </div>
              {ap.evaluationNote && (
                <div>
                  <span className="font-medium text-slate-700">Evaluasi: </span>
                  <span className="text-slate-600">{ap.evaluationNote}</span>
                </div>
              )}
              {ap.evidenceLink && (
                <div>
                  <span className="font-medium text-slate-700">Bukti: </span>
                  <a href={ap.evidenceLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {ap.evidenceLink}
                  </a>
                </div>
              )}
              {ap.reviewNote && (
                <div>
                  <span className="font-medium text-slate-700">Catatan Review: </span>
                  <span className="text-slate-600">{ap.reviewNote}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                {canStart && (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={startLoading}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {startLoading ? 'Memproses...' : 'Mulai Kerja'}
                  </button>
                )}
                {canSubmit && (
                  <button
                    type="button"
                    onClick={() => setSubmitOpen(true)}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                  >
                    Submit untuk Review
                  </button>
                )}
                {canReview && (
                  <button
                    type="button"
                    onClick={() => setReviewOpen(true)}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                  >
                    Review
                  </button>
                )}
                {canReassign && (
                  <button
                    type="button"
                    onClick={() => setReassignOpen(true)}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                  >
                    Reassign
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'checklist' && (
            <ChecklistList actionPlanId={ap.id} editable={editableChecklist} />
          )}

          {tab === 'comments' && <CommentThread actionPlanId={ap.id} />}
        </div>
      </DialogContent>

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
    </Dialog>
  )
}
