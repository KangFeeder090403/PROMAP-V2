'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionPlan } from '@/components/action-plans/ActionPlansClient'
import { createActionPlanSchema, updateActionPlanSchema } from '@/lib/validations/actionPlan'
import { z } from 'zod'

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : ''
}

export function ActionPlanFormModal({
  open,
  onOpenChange,
  actionPlan,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionPlan: ActionPlan | null
  onSuccess: () => void
}) {
  const mode: 'create' | 'edit' = actionPlan ? 'edit' : 'create'
  const schema = mode === 'create' ? createActionPlanSchema : updateActionPlanSchema
  type FormValues = z.infer<typeof createActionPlanSchema>

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema as any) })

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    reset({
      title: actionPlan?.title ?? '',
      outcomeKpi: actionPlan?.outcomeKpi ?? '',
      priority: (actionPlan?.priority as any) ?? 'MEDIUM',
      startDate: toDateInput(actionPlan?.startDate),
      endDate: toDateInput(actionPlan?.endDate),
      taskId: actionPlan?.taskId ?? '',
      picId: actionPlan?.picId ?? '',
    })
  }, [open, actionPlan, reset])

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

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {mode === 'create' ? 'Action Plan Baru' : 'Edit Action Plan'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-slate-700">Judul</Label>
            <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outcomeKpi" className="text-slate-700">Outcome KPI</Label>
            <Input id="outcomeKpi" aria-invalid={!!errors.outcomeKpi} {...register('outcomeKpi')} />
            {errors.outcomeKpi && <p className="text-sm text-red-600">{errors.outcomeKpi.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priority" className="text-slate-700">Prioritas</Label>
            <select
              id="priority"
              {...register('priority')}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="HIGH">Tinggi</option>
              <option value="MEDIUM">Sedang</option>
              <option value="LOW">Rendah</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-slate-700">Mulai</Label>
              <Input id="startDate" type="date" aria-invalid={!!errors.startDate} {...register('startDate')} />
              {errors.startDate && <p className="text-sm text-red-600">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-slate-700">Selesai</Label>
              <Input id="endDate" type="date" aria-invalid={!!errors.endDate} {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-red-600">{errors.endDate.message}</p>}
            </div>
          </div>

          {mode === 'create' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="taskId" className="text-slate-700">Task ID (opsional, kosongkan untuk Personal AP)</Label>
                <Input id="taskId" {...register('taskId')} placeholder="taskId..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="picId" className="text-slate-700">PIC ID (opsional, default diri sendiri)</Label>
                <Input id="picId" {...register('picId')} placeholder="picId..." />
              </div>
            </>
          )}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
