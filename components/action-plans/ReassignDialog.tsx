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
import { AlertCircle, UserCheck } from 'lucide-react'

interface UserOption {
  id: string
  name: string
  divisionId: string | null
  status?: string
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
  const [fetchingUsers, setFetchingUsers] = useState(false)

  const isPersonal = !divisionId

  useEffect(() => {
    if (!open) return
    setNewPicId('')
    setFieldError('')
    setSubmitError('')

    if (isPersonal) {
      setUsers([])
      return
    }

    setFetchingUsers(true)
    fetch('/api/users?status=ACTIVE')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: UserOption[]) => {
        setUsers(data.filter((u) => u.divisionId === divisionId))
      })
      .catch(() => setUsers([]))
      .finally(() => setFetchingUsers(false))
  }, [open, divisionId, isPersonal])

  async function handleSubmit() {
    if (isPersonal) {
      setFieldError('Action Plan personal tidak dapat dialihkan ke PIC lain.')
      return
    }

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
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <UserCheck className="h-5 w-5" />
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Alihkan PIC Action Plan
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isPersonal ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                Action Plan ini bersifat Personal (tanpa divisi). Sesuai aturan sistem, tugas personal tidak dapat dialihkan ke PIC lain.
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="newPicId" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Pilih PIC Baru (Satu Divisi)
              </Label>
              {fetchingUsers ? (
                <div className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 flex items-center text-xs text-slate-400">
                  Memuat daftar anggota divisi...
                </div>
              ) : users.length === 0 ? (
                <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
                  Tidak ditemukan anggota aktif lain pada divisi ini.
                </div>
              ) : (
                <select
                  id="newPicId"
                  value={newPicId}
                  onChange={(e) => setNewPicId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih PIC pengganti...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )}
              {fieldError && <p className="text-xs text-red-600 dark:text-red-400">{fieldError}</p>}
            </div>
          )}

          {submitError && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-900">
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="inline-flex items-center justify-center h-9 px-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || isPersonal || users.length === 0 || !newPicId}
            className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Menyimpan...' : 'Alihkan PIC'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
