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
import { reassignActionPlanSchema } from '@/lib/validations/actionPlan'

interface UserOption {
  id: string
  name: string
  divisionId: string | null
}

export function ReassignDialog({
  open,
  onOpenChange,
  actionPlanId,
  divisionId,
  onSuccess,
  onConflict,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionPlanId: string
  divisionId: string | null
  onSuccess: () => void
  onConflict: () => void
}) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [newPicId, setNewPicId] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setNewPicId('')
    setFieldError('')
    setSubmitError('')
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: UserOption[]) => setUsers(data.filter((u) => u.divisionId === divisionId)))
      .catch(() => setUsers([]))
  }, [open, divisionId])

  async function handleSubmit() {
    const parsed = reassignActionPlanSchema.safeParse({ newPicId })
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Data tidak valid')
      return
    }
    setFieldError('')
    setSubmitError('')
    setLoading(true)

    const res = await fetch(`/api/action-plans/${actionPlanId}/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })

    setLoading(false)

    if (res.status === 409) {
      onConflict()
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSubmitError(data.error || 'Gagal reassign Action Plan')
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Reassign PIC</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPicId" className="text-slate-700">
              PIC Baru
            </Label>
            <select
              id="newPicId"
              value={newPicId}
              onChange={(e) => setNewPicId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Pilih PIC</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {fieldError && <p className="text-sm text-red-600">{fieldError}</p>}
          </div>

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
            {loading ? 'Menyimpan...' : 'Reassign'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
