'use client'

import Link from 'next/link'
import { CheckCircle2, ArrowRight, Layers } from 'lucide-react'

interface WorkstationEmptyStateProps {
  type?: 'no-selection' | 'all-done' | 'empty'
}

export function WorkstationEmptyState({ type = 'no-selection' }: WorkstationEmptyStateProps) {
  if (type === 'all-done') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Semua Rencana Aksi Tuntas
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
          Bagus sekali! Tidak ada Action Plan yang membutuhkan aksi atau menunggu verifikasi dari Anda saat ini.
        </p>
        <Link
          href="/board"
          className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
        >
          <span>Buka Papan Kanban</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    )
  }

  if (type === 'empty') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-4">
          <Layers className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Belum Ada Tugas
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
          Belum ada Action Plan yang ditugaskan kepada Anda pada filter ini.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
        <Layers className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
        Pilih Action Plan
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
        Klik salah satu Action Plan di daftar sebelah kiri untuk langsung melihat rincian, checklist, dan bukti kerja di sini.
      </p>
    </div>
  )
}
