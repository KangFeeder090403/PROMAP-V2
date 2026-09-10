'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { createActionPlanSchema, updateActionPlanSchema } from '@/lib/validations/actionPlan'
import { z } from 'zod'

type FormValues = z.infer<typeof createActionPlanSchema>

type PickUser = { id: string; name: string; status: string; divisionId: string | null }
type PickTask = { id: string; title: string; projectId: string }

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : ''
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

export function ActionPlanFormModal({
  open,
  onOpenChange,
  actionPlan,
  defaults,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionPlan: ActionPlan | null
  /** Pre-fill dari konteks pemanggil (halaman project, board, My Work). */
  defaults?: { taskId?: string | null; picId?: string | null }
  onSuccess: () => void
}) {
  const mode: 'create' | 'edit' = actionPlan ? 'edit' : 'create'
  const schema = mode === 'create' ? createActionPlanSchema : updateActionPlanSchema

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [createMore, setCreateMore] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [users, setUsers] = useState<PickUser[]>([])
  const [tasks, setTasks] = useState<PickTask[]>([])
  const [projectNames, setProjectNames] = useState<Record<string, string>>({})

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema as never) })

  // Jangan buang isian tanpa peringatan — berlaku untuk Esc, klik overlay, dan Batal.
  function requestClose(next: boolean) {
    if (!next && isDirty) {
      setShowDiscardConfirm(true)
      return
    }
    onOpenChange(next)
  }

  function handleConfirmDiscard() {
    setShowDiscardConfirm(false)
    reset()
    onOpenChange(false)
  }

  const taskId = watch('taskId')

  // Opsi picker hanya dibutuhkan saat create. Semua endpoint sudah discope RBAC
  // di server, jadi daftar yang kembali sudah aman untuk role ini.
  useEffect(() => {
    if (!open || mode !== 'create') return
    Promise.all([
      fetch('/api/users').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/tasks').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/projects').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([u, t, p]) => {
        setUsers(Array.isArray(u) ? u : [])
        setTasks(Array.isArray(t) ? t : [])
        setProjectNames(
          Object.fromEntries(
            (Array.isArray(p) ? p : []).map((x: { id: string; name: string }) => [x.id, x.name])
          )
        )
      })
      .catch(() => {
        setUsers([])
        setTasks([])
        setProjectNames({})
      })
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    setShowMore(false)
    reset({
      title: actionPlan?.title ?? '',
      outcomeKpi: actionPlan?.outcomeKpi ?? '',
      priority: actionPlan?.priority ?? 'MEDIUM',
      startDate: toDateInput(actionPlan?.startDate) || today(),
      endDate: toDateInput(actionPlan?.endDate),
      taskId: actionPlan?.taskId ?? defaults?.taskId ?? '',
      picId: actionPlan?.picId ?? defaults?.picId ?? '',
    })
    // Fokus awal ke field yang user butuhkan, bukan tombol tutup (W3C APG).
    setTimeout(() => setFocus('title'), 0)
  }, [open, actionPlan, defaults, reset, setFocus])

  // Field wajib yang tersembunyi di balik "Detail lainnya" harus terlihat kalau
  // ia yang error — kalau tidak, user melihat submit gagal tanpa pesan.
  useEffect(() => {
    if (errors.outcomeKpi || errors.startDate) setShowMore(true)
    const first = (['title', 'endDate', 'outcomeKpi', 'startDate'] as const).find((f) => errors[f])
    if (first) setFocus(first)
  }, [errors, setFocus])

  // Hanya anggota aktif — target AP wajib user yang bisa bekerja.
  const assignable = users.filter((u) => u.status === 'ACTIVE')
  const selectedTask = tasks.find((t) => t.id === taskId)

  async function onSubmit(values: FormValues) {
    setSubmitError('')
    setLoading(true)

    const url = mode === 'create' ? '/api/action-plans' : `/api/action-plans/${actionPlan!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'
    // status TIDAK PERNAH dikirim — hanya berubah lewat submit/review/reassign
    const body =
      mode === 'create'
        ? {
            title: values.title,
            outcomeKpi: values.outcomeKpi,
            priority: values.priority,
            startDate: values.startDate,
            endDate: values.endDate,
            taskId: values.taskId || null,
            picId: values.picId || undefined,
          }
        : {
            title: values.title,
            outcomeKpi: values.outcomeKpi,
            priority: values.priority,
            startDate: values.startDate,
            endDate: values.endDate,
          }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)

    if (res.status === 409) {
      setSubmitError('Status sudah berubah, silakan refresh')
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSubmitError(data.error || 'Gagal menyimpan Action Plan')
      return
    }

    // "Buat lagi": modal tetap terbuka, konteks (task/PIC/tanggal) dipertahankan
    // supaya entri beruntun tidak perlu diisi ulang.
    if (createMore && mode === 'create') {
      reset({
        title: '',
        outcomeKpi: '',
        priority: values.priority,
        startDate: values.startDate,
        endDate: values.endDate,
        taskId: values.taskId,
        picId: values.picId,
      })
      setFocus('title')
      onSuccess()
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-50">
            {mode === 'create' ? 'Action Plan Baru' : 'Edit Action Plan'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(onSubmit)()
          }}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">Judul</Label>
            <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
            {errors.title && <p className="text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endDate" className="text-slate-700 dark:text-slate-300">Tenggat</Label>
            <Input id="endDate" type="date" aria-invalid={!!errors.endDate} {...register('endDate')} />
            {errors.endDate && <p className="text-sm text-red-600 dark:text-red-400">{errors.endDate.message}</p>}
          </div>

          {mode === 'create' && (
            <div className="space-y-1.5">
              <Label htmlFor="picId" className="text-slate-700 dark:text-slate-300">PIC</Label>
              {selectedTask ? (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Mengikuti PIC task terpilih.
                </p>
              ) : (
                <select id="picId" {...register('picId')} className={SELECT_CLASS}>
                  <option value="">Saya sendiri</option>
                  {assignable.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {showMore ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Detail lainnya
          </button>

          {showMore && (
            <div className="space-y-4 border-l-2 border-slate-100 pl-3 dark:border-slate-800">
              <div className="space-y-1.5">
                <Label htmlFor="outcomeKpi" className="text-slate-700 dark:text-slate-300">Outcome KPI</Label>
                <Input id="outcomeKpi" aria-invalid={!!errors.outcomeKpi} {...register('outcomeKpi')} />
                {errors.outcomeKpi && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.outcomeKpi.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="priority" className="text-slate-700 dark:text-slate-300">Prioritas</Label>
                  <select id="priority" {...register('priority')} className={SELECT_CLASS}>
                    <option value="HIGH">Tinggi</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="LOW">Rendah</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-slate-700 dark:text-slate-300">Mulai</Label>
                  <Input id="startDate" type="date" aria-invalid={!!errors.startDate} {...register('startDate')} />
                  {errors.startDate && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.startDate.message}</p>
                  )}
                </div>
              </div>

              {mode === 'create' && (
                <div className="space-y-1.5">
                  <Label htmlFor="taskId" className="text-slate-700 dark:text-slate-300">Task induk</Label>
                  <select id="taskId" {...register('taskId')} className={SELECT_CLASS}>
                    <option value="">Tanpa task — Action Plan personal</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {projectNames[t.projectId] ? `${projectNames[t.projectId]} · ` : ''}
                        {t.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Kalau task dipilih, PIC dan divisi mengikuti task tersebut.
                  </p>
                </div>
              )}
            </div>
          )}

          {submitError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            {mode === 'create' ? (
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={createMore}
                  onChange={(e) => setCreateMore(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                />
                Buat lagi
              </label>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => requestClose(false)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>

      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Tutup Form?"
        message="Ada isian yang belum disimpan. Isian yang sudah Anda ketik akan dibuang jika menutup sekarang."
        confirmText="Buang Isian"
        cancelText="Lanjut Mengisi"
        variant="warning"
        onConfirm={handleConfirmDiscard}
      />
    </Dialog>
  )
}
