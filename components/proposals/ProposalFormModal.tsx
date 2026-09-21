'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Proposal } from '@/components/proposals/ProposalsClient'
import { Target, AlertCircle, Lightbulb, FileEdit } from 'lucide-react'

interface ProposalFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: Proposal | null
  onSuccess: () => void
}

const CATEGORIES = [
  'Efisiensi Operasional',
  'Pengembangan Produk',
  'Peningkatan Kualitas & Layanan',
  'Pengurangan Biaya / Waste',
  'Otomasi & Tooling Internal',
  'Lainnya',
]

export function ProposalFormModal({
  open,
  onOpenChange,
  proposal,
  onSuccess,
}: ProposalFormModalProps) {
  const mode: 'create' | 'edit' = proposal ? 'edit' : 'create'

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [problem, setProblem] = useState('')
  const [solution, setSolution] = useState('')
  const [impact, setImpact] = useState('')
  const [submitNow, setSubmitNow] = useState(false)

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubmitError('')

    if (proposal) {
      setTitle(proposal.title || '')
      // Parsing jika deskripsi terformat sebelumnya
      const desc = proposal.description || ''
      setProblem(desc)
      setSolution('')
      setImpact('')
      setCategory(CATEGORIES[0])
    } else {
      setTitle('')
      setCategory(CATEGORIES[0])
      setProblem('')
      setSolution('')
      setImpact('')
      setSubmitNow(false)
    }
  }, [open, proposal])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setSubmitError('Judul usulan wajib diisi')
      return
    }
    if (!problem.trim()) {
      setSubmitError('Latar belakang masalah wajib diisi')
      return
    }

    // Gabungkan 4 bagian terstruktur ke description
    const fullDescription = [
      `[Kategori: ${category}]`,
      '',
      `LATAR BELAKANG & MASALAH:`,
      problem.trim(),
      '',
      solution.trim() ? `USULAN SOLUSI & TINDAKAN:\n${solution.trim()}\n` : '',
      impact.trim() ? `TARGET HASIL / ESTIMASI DAMPAK:\n${impact.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n')
      .trim()

    setSubmitError('')
    setLoading(true)

    const url = mode === 'create' ? '/api/proposals' : `/api/proposals/${proposal!.id}`
    const method = mode === 'create' ? 'POST' : 'PUT'
    const body =
      mode === 'create'
        ? {
            title: title.trim(),
            description: fullDescription,
            status: submitNow ? 'SUBMITTED' : 'DRAFT',
          }
        : { title: title.trim(), description: fullDescription }

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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2 text-base font-semibold">
            <FileEdit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {mode === 'create' ? 'Buat Usulan Inisiatif Baru' : 'Edit Usulan Inisiatif'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-1" noValidate>
          {/* Judul */}
          <div className="space-y-1.5">
            <Label htmlFor="prop-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Judul Usulan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="prop-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Digitalisasi Formulir Permintaan Barang Antar Divisi"
              className="h-9 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Kategori */}
          <div className="space-y-1.5">
            <Label htmlFor="prop-category" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kategori Inisiatif
            </Label>
            <select
              id="prop-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Bagian 1: Masalah */}
          <div className="space-y-1.5">
            <Label htmlFor="prop-problem" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Latar Belakang & Masalah <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="prop-problem"
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Apa kendala atau hambatan operasional yang terjadi saat ini?"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bagian 2: Solusi */}
          <div className="space-y-1.5">
            <Label htmlFor="prop-solution" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Rencana Aksi / Solusi yang Diusulkan
            </Label>
            <textarea
              id="prop-solution"
              rows={3}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Langkah atau metode spesifik apa yang direkomendasikan untuk menyelesaikan masalah tersebut?"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bagian 3: Estimasi Dampak */}
          <div className="space-y-1.5">
            <Label htmlFor="prop-impact" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target Hasil / Dampak Operasional
            </Label>
            <textarea
              id="prop-impact"
              rows={2}
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="Contoh: Menghemat waktu pemrosesan hingga 50%, mengurangi kesalahan input data"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {mode === 'create' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                id="submitNow"
                type="checkbox"
                checked={submitNow}
                onChange={(e) => setSubmitNow(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="submitNow" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                Langsung submit ke meja review manajer (bukan simpan sebagai draft)
              </Label>
            </div>
          )}

          {submitError && <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
            >
              {loading ? 'Menyimpan...' : mode === 'create' ? (submitNow ? 'Ajukan Sekarang' : 'Simpan Draft') : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
