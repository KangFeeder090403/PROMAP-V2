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
import { Rocket, Calendar, Flag, Sparkles } from 'lucide-react'
import type { Proposal } from '@/components/proposals/ProposalsClient'

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function ProposalConvertModal({
  open,
  onOpenChange,
  proposal,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: Proposal | null
  onSuccess: (ap: any) => void
}) {
  const [title, setTitle] = useState('')
  const [outcomeKpi, setOutcomeKpi] = useState('')
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')
  const [startDate, setStartDate] = useState(() => toDateInput(new Date()))
  const [endDate, setEndDate] = useState(() =>
    toDateInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !proposal) return
    setTitle(proposal.title)
    setOutcomeKpi(proposal.description)
    setPriority('MEDIUM')
    setStartDate(toDateInput(new Date()))
    setEndDate(toDateInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)))
    setError('')
  }, [open, proposal])

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault()
    if (!proposal) return
    if (!title.trim() || !outcomeKpi.trim()) {
      setError('Judul dan Outcome/KPI wajib diisi')
      return
    }

    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/proposals/${proposal.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          outcomeKpi: outcomeKpi.trim(),
          priority,
          startDate,
          endDate,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengonversi proposal')
      }

      onOpenChange(false)
      onSuccess(json.actionPlan)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  if (!proposal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Rocket size={16} />
            </div>
            <DialogTitle className="text-slate-900 dark:text-slate-100 text-base">
              Konversi Proposal ke Action Plan
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Usulan yang telah disetujui akan diwujudkan menjadi Action Plan eksekusi nyata untuk tim.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConvert} className="space-y-4 pt-1">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Proposer Info Banner */}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-slate-400">Diusulkan oleh:</span>{' '}
              <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                {proposal.proposer?.name ?? 'Pengusul'}
              </strong>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
              <Sparkles size={11} />
              Status Disetujui
            </span>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="convTitle" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Judul Action Plan <span className="text-red-500">*</span>
            </Label>
            <input
              id="convTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Implementasi Sistem Tracking..."
              required
            />
          </div>

          {/* Outcome KPI */}
          <div className="space-y-1">
            <Label htmlFor="convOutcome" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Outcome / Target KPI <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="convOutcome"
              rows={3}
              value={outcomeKpi}
              onChange={(e) => setOutcomeKpi(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              placeholder="Jelaskan deliverable target nyata yang harus tercapai..."
              required
            />
          </div>

          {/* Priority & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Priority */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Flag size={12} className="text-slate-400" />
                Prioritas
              </Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="HIGH">Tinggi (High)</option>
                <option value="MEDIUM">Sedang (Medium)</option>
                <option value="LOW">Rendah (Low)</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                Tgl Mulai
              </Label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                Tenggat (Due)
              </Label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <button
              type="button"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-xs font-semibold text-white transition-colors shadow-sm disabled:opacity-50"
            >
              <Rocket size={13} />
              {loading ? 'Mengonversi...' : 'Konfirmasi & Jadikan Action Plan'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
