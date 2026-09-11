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
import type { Proposal } from '@/components/proposals/ProposalsClient'
import { createProposalSchema } from '@/lib/validations/proposal'
import { z } from 'zod'

const formSchema = createProposalSchema
  .omit({ status: true })
  .extend({ submitNow: z.boolean() })

type FormValues = z.infer<typeof formSchema>

export function ProposalFormModal({
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
  const mode: 'create' | 'edit' = proposal ? 'edit' : 'create'

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    reset({
      title: proposal?.title ?? '',
      description: proposal?.description ?? '',
      submitNow: false,
    })
  }, [open, proposal, reset])

  async function onSubmit(values: FormValues) {
    setSubmitError('')
    setLoading(true)

    const url = mode === 'create' ? '/api/proposals' : `/api/proposals/${proposal!.id}`
    const method = mode === 'create' ? 'POST' : 'PUT'
    const body =
      mode === 'create'
        ? {
            title: values.title,
            description: values.description,
            status: values.submitNow ? 'SUBMITTED' : 'DRAFT',
          }
        : { title: values.title, description: values.description }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSubmitError(data.error || 'Gagal menyimpan proposal')
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            {mode === 'create' ? 'Proposal Baru' : 'Edit Proposal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">
              Judul
            </Label>
            <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
            {errors.title && <p className="text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">
              Deskripsi
            </Label>
            <textarea
              id="description"
              rows={4}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>

          {mode === 'create' && (
            <div className="flex items-center gap-2">
              <input
                id="submitNow"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-500 focus:ring-blue-500"
                {...register('submitNow')}
              />
              <Label htmlFor="submitNow" className="text-slate-700 dark:text-slate-300">
                Langsung submit untuk approval
              </Label>
            </div>
          )}

          {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
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
