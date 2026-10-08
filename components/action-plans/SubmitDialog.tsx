'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { submitActionPlanSchema } from '@/lib/validations/actionPlan'
import { refreshNotifs } from '@/lib/notify-refresh'

export function SubmitDialog({
  open,
  onOpenChange,
  actionPlanId,
  onSuccess,
  onConflict,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionPlanId: string
  onSuccess: () => void
  onConflict: () => void
}) {
  const [evaluationNote, setEvaluationNote] = useState('')
  const [evidenceLink, setEvidenceLink] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setEvaluationNote('')
    setEvidenceLink('')
    setFieldError('')
    setSubmitError('')
  }, [open])

  async function handleSubmit() {
    const parsed = submitActionPlanSchema.safeParse({
      evaluationNote,
      evidenceLink: evidenceLink || undefined,
    })
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Data tidak valid')
      return
    }
    setFieldError('')
    setSubmitError('')
    setLoading(true)

    const res = await fetch(`/api/action-plans/${actionPlanId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluationNote: parsed.data.evaluationNote,
        evidenceLink: parsed.data.evidenceLink || undefined,
      }),
    })

    setLoading(false)

    if (res.status === 409) {
      onConflict()
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSubmitError(data.error || 'Gagal submit Action Plan')
      return
    }

    refreshNotifs()
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Submit Action Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="evaluationNote" className="text-slate-700">
              Evaluasi
            </Label>
            <textarea
              id="evaluationNote"
              rows={4}
              value={evaluationNote}
              onChange={(e) => setEvaluationNote(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evidenceLink" className="text-slate-700">
              Link Bukti (opsional)
            </Label>
            <Input
              id="evidenceLink"
              value={evidenceLink}
              onChange={(e) => setEvidenceLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {fieldError && <p className="text-sm text-red-600">{fieldError}</p>}
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Mengirim...' : 'Submit'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
