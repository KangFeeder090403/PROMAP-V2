'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { Role } from '@/lib/generated/prisma/client'
import {
  ExternalLink,
  ChevronRight,
  Target,
  FileText,
  StickyNote,
  Paperclip,
  Check,
  Edit2,
  Globe,
  Github,
  Maximize2,
  MessageSquare,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL, AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { ChecklistList } from '@/components/action-plans/ChecklistList'
import { CommentThread } from '@/components/comments/CommentThread'
import { SubmitDialog } from '@/components/action-plans/SubmitDialog'
import { ReviewDialog } from '@/components/action-plans/ReviewDialog'

interface WorkstationInspectorProps {
  actionPlan: ActionPlan
  role: Role
  userId: string
  onChanged: () => void
}

type TabMode = 'work' | 'activity'
type PresetReview = 'COMPLETE' | 'REJECTED' | 'EVIDENCE_REQUIRED'

function getServiceIcon(url: string) {
  const lower = url.toLowerCase()
  if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
    return <FileText className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-300" />
  }
  if (lower.includes('figma.com')) {
    return <Target className="h-4 w-4 shrink-0 text-purple-500" />
  }
  if (lower.includes('github.com') || lower.includes('gitlab.com')) {
    return <Github className="h-4 w-4 shrink-0 text-slate-800 dark:text-slate-200" />
  }
  return <Globe className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-300" />
}

export function WorkstationInspector({
  actionPlan,
  role,
  userId,
  onChanged,
}: WorkstationInspectorProps) {
  const [tab, setTab] = useState<TabMode>('work')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [presetReview, setPresetReview] = useState<PresetReview>('COMPLETE')
  const [startLoading, setStartLoading] = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // Inline Evidence Editor State
  const [isEditingEvidence, setIsEditingEvidence] = useState(false)
  const [inlineEvidence, setInlineEvidence] = useState('')
  const [inlineNote, setInlineNote] = useState('')
  const [savingEvidence, setSavingEvidence] = useState(false)

  const isOwner = actionPlan.picId === userId
  const isManagerOrHigher = role === 'MANAGER' || role === 'ADMIN_OPERATIONAL' || role === 'SUPER_ADMIN'

  // Permission actions
  const canStart = (isOwner || isManagerOrHigher) && actionPlan.status === 'NOT_STARTED'
  const canCompleteDirectly =
    isManagerOrHigher &&
    ['IN_PROGRESS', 'EVIDENCE_REQUIRED', 'REJECTED'].includes(actionPlan.status)
  const canSubmit = isOwner && ['IN_PROGRESS', 'EVIDENCE_REQUIRED', 'REJECTED', 'OVERDUE'].includes(actionPlan.status)
  const canReview = isManagerOrHigher && ['PENDING_APPROVAL', 'EVIDENCE_REQUIRED'].includes(actionPlan.status)

  async function handleStart() {
    setStartLoading(true)
    setActionError('')
    try {
      const res = await fetch(`/api/action-plans/${actionPlan.id}/start`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        setActionError(err.error || 'Gagal memulai Action Plan')
        return
      }
      onChanged()
    } catch {
      setActionError('Terjadi kesalahan jaringan')
    } finally {
      setStartLoading(false)
    }
  }

  async function handleCompletePersonal() {
    setCompleteLoading(true)
    setActionError('')
    try {
      const res = await fetch(`/api/action-plans/${actionPlan.id}/complete`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        setActionError(err.error || 'Gagal menyelesaikan Action Plan')
        return
      }
      onChanged()
    } catch {
      setActionError('Terjadi kesalahan jaringan')
    } finally {
      setCompleteLoading(false)
    }
  }

  async function handleSaveEvidence() {
    setSavingEvidence(true)
    try {
      const res = await fetch(`/api/action-plans/${actionPlan.id}`, {
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
    } finally {
      setSavingEvidence(false)
    }
  }

  const planCode = actionPlan.code || (actionPlan as { refCode?: string }).refCode || 'AP'

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header Workstation Inspector */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
        {/* Breadcrumb & Full Page Shortcut */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate min-w-0">
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              {planCode}
            </span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{actionPlan.task?.project?.name ?? 'Proyek'}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">{actionPlan.task?.title ?? 'Task'}</span>
          </div>

          <Link
            href={`/action-plans/${actionPlan.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline shrink-0"
            title="Buka Halaman Penuh"
          >
            <span>Buka Penuh</span>
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Title & Status Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
            {actionPlan.title}
          </h2>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${AP_PRIORITY_STYLE[actionPlan.priority]}`}>
              {AP_PRIORITY_LABEL[actionPlan.priority]}
            </span>
            <StatusBadge
              status={actionPlan.status}
              styleMap={AP_STATUS_STYLE}
              labelMap={AP_STATUS_LABEL}
            />
          </div>
        </div>

        {/* Action Toolbar (Inline Status Trigger) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {canStart && (
            <button
              type="button"
              onClick={handleStart}
              disabled={startLoading}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs active:scale-95 disabled:opacity-50"
            >
              {startLoading ? 'Memproses...' : 'Mulai Kerjakan'}
            </button>
          )}

          {canCompleteDirectly && (
            <button
              type="button"
              onClick={handleCompletePersonal}
              disabled={completeLoading}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs active:scale-95 disabled:opacity-50"
            >
              {completeLoading ? 'Memproses...' : 'Tandai Selesai'}
            </button>
          )}

          {canSubmit && (
            <button
              type="button"
              onClick={() => setSubmitOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs active:scale-95"
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
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs active:scale-95"
            >
              Tinjau &amp; Beri Keputusan
            </button>
          )}

          {/* Tab Navigasi Inspector (Work vs Activity) */}
          <div className="ml-auto flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('work')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                tab === 'work'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Pekerjaan</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('activity')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                tab === 'activity'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Aktivitas</span>
            </button>
          </div>
        </div>

        {actionError && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">{actionError}</p>
        )}
      </div>

      {/* Body Scrollable Section */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <AnimatePresence mode="wait">
          {tab === 'work' ? (
            <motion.div
              key="work-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* Sasaran & Outcome / Deskripsi */}
              {actionPlan.outcomeKpi && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sasaran KPI &amp; Outcome
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60 whitespace-pre-wrap">
                    {actionPlan.outcomeKpi}
                  </p>
                </div>
              )}

              {/* Checklist Operasional Langsung */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Checklist Bukti Kerja
                  </h4>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                  <ChecklistList
                    actionPlanId={actionPlan.id}
                    editable={isOwner || isManagerOrHigher}
                  />
                </div>
              </div>

              {/* Bukti Kerja & Catatan Evaluasi (Inline Display / Editor) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Tautan Bukti Kerja (Evidence)
                  </h4>
                  {isOwner && !isEditingEvidence && (
                    <button
                      type="button"
                      onClick={() => {
                        setInlineEvidence(actionPlan.evidenceLink || '')
                        setInlineNote(actionPlan.evaluationNote || '')
                        setIsEditingEvidence(true)
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{actionPlan.evidenceLink ? 'Ubah Bukti' : 'Unggah Bukti'}</span>
                    </button>
                  )}
                </div>

                {isEditingEvidence ? (
                  <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                    <div>
                      <label htmlFor="evidence-url" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Tautan Bukti (Google Drive, Figma, GitHub, dsb.)
                      </label>
                      <input
                        id="evidence-url"
                        type="url"
                        value={inlineEvidence}
                        onChange={(e) => setInlineEvidence(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full h-8 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="eval-note" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Catatan Singkat PIC
                      </label>
                      <input
                        id="eval-note"
                        type="text"
                        value={inlineNote}
                        onChange={(e) => setInlineNote(e.target.value)}
                        placeholder="Ringkasan pengerjaan atau keterangan file..."
                        className="w-full h-8 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingEvidence(false)}
                        className="px-3 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEvidence}
                        disabled={savingEvidence}
                        className="px-3 py-1 rounded-lg text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
                      >
                        {savingEvidence ? 'Menyimpan...' : 'Simpan Bukti'}
                      </button>
                    </div>
                  </div>
                ) : actionPlan.evidenceLink ? (
                  <div className="space-y-2">
                    <a
                      href={actionPlan.evidenceLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-2xs"
                    >
                      {getServiceIcon(actionPlan.evidenceLink)}
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate flex-1">
                        {actionPlan.evidenceLink}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </a>
                    {actionPlan.evaluationNote && (
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 italic">
                        <StickyNote className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>&ldquo;{actionPlan.evaluationNote}&rdquo;</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    Belum ada bukti kerja yang dilampirkan.
                  </p>
                )}
              </div>

              {/* Reviewer Feedback Note (jika rejected / evidence required) */}
              {actionPlan.reviewNote && (
                <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-bold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Catatan Reviewer:</span>
                  </div>
                  <p className="text-xs text-red-800 dark:text-red-300">
                    {actionPlan.reviewNote}
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="activity-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <CommentThread actionPlanId={actionPlan.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dialog Modals */}
      {submitOpen && (
        <SubmitDialog
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          actionPlanId={actionPlan.id}
          onSuccess={onChanged}
          onConflict={onChanged}
        />
      )}

      {reviewOpen && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          actionPlanId={actionPlan.id}
          title={actionPlan.title}
          presetAction={presetReview}
          onSuccess={onChanged}
          onConflict={onChanged}
        />
      )}
    </div>
  )
}
