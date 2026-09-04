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
import { reviewActionPlanSchema } from '@/lib/validations/actionPlan'

type ReviewAction = 'COMPLETE' | 'REJECTED' | 'EVIDENCE_REQUIRED'

export function ReviewDialog({
  open,
  onOpenChange,
  actionPlanId,
  title,
  onSuccess,
  onConflict,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionPlanId: string
  title?: string
  onSuccess: () => void
  onConflict: () => void
}) {
  const [reviewNote, setReviewNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState<ReviewAction | null>(null)

  useEffect(() => {
    if (!open) return
    setReviewNote('')
    setNoteError('')
    setSubmitError('')
  }, [open])

  async function handleReview(action: ReviewAction) {
    const parsed = reviewActionPlanSchema.safeParse({
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

    const res = await fetch(`/api/action-plans/${actionPlanId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })

    setLoading(null)

    if (res.status === 409) {
      onConflict()
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSubmitError(data.error || 'Gagal memproses review')
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Review Action Plan</DialogTitle>
          {title && <DialogDescription>{title}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reviewNote" className="text-slate-700">
              Catatan Review
            </Label>
            <textarea
              id="reviewNote"
              rows={4}
              placeholder="Wajib diisi jika Tolak atau Minta Bukti"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {noteError && <p className="text-sm text-red-600">{noteError}</p>}
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={!!loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => handleReview('EVIDENCE_REQUIRED')}
            disabled={!!loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === 'EVIDENCE_REQUIRED' ? 'Memproses...' : 'Minta Bukti'}
          </button>
          <button
            type="button"
            onClick={() => handleReview('REJECTED')}
            disabled={!!loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === 'REJECTED' ? 'Memproses...' : 'Tolak'}
          </button>
          <button
            type="button"
            onClick={() => handleReview('COMPLETE')}
            disabled={!!loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading === 'COMPLETE' ? 'Memproses...' : 'Setujui'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
