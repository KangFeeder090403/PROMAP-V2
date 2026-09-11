'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { Proposal } from '@/components/proposals/ProposalsClient'
import { reviewProposalSchema } from '@/lib/validations/proposal'

export function ProposalReviewDialog({
  open,
  onOpenChange,
  proposal,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: Proposal | null
  onSuccess: () => void
}) {
  const [reviewNote, setReviewNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState<'APPROVE' | 'REJECT' | null>(null)

  useEffect(() => {
    if (!open) return
    setReviewNote('')
    setNoteError('')
    setSubmitError('')
  }, [open])

  async function handleReview(action: 'APPROVE' | 'REJECT') {
    const parsed = reviewProposalSchema.safeParse({
      action,
      reviewNote: reviewNote.trim() || undefined,
    })
    if (!parsed.success) {
      setNoteError(parsed.error.issues[0]?.message ?? 'Data tidak valid')
      return
    }
    setNoteError('')
    setSubmitError('')
    setLoading(action)

    const res = await fetch(`/api/proposals/${proposal!.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })

    setLoading(null)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSubmitError(data.error || 'Gagal memproses review')
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">Review Proposal</DialogTitle>
          <DialogDescription className="font-semibold text-slate-800 dark:text-slate-200">{proposal?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {proposal?.description && (
            <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Deskripsi Usulan
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {proposal.description}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reviewNote" className="text-slate-700 dark:text-slate-300">
              Catatan Review
            </Label>
            <textarea
              id="reviewNote"
              rows={4}
              placeholder="Wajib diisi jika menolak"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {noteError && <p className="text-sm text-red-600 dark:text-red-400">{noteError}</p>}
          </div>

          {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={!!loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => handleReview('REJECT')}
            disabled={!!loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === 'REJECT' ? 'Memproses...' : 'Tolak'}
          </button>
          <button
            type="button"
            onClick={() => handleReview('APPROVE')}
            disabled={!!loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === 'APPROVE' ? 'Memproses...' : 'Setujui'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
