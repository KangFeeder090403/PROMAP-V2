'use client'

import Link from 'next/link'
import { CheckCircle2, ArrowRight, Layers } from 'lucide-react'

interface WorkstationEmptyStateProps {
  type?: 'no-selection' | 'all-done' | 'empty'
}

export function WorkstationEmptyState({ type = 'no-selection' }: WorkstationEmptyStateProps) {
  if (type === 'all-done') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-border">
        <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Semua Action Plan tuntas.
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          Tidak ada Action Plan yang menunggu aksi atau verifikasi Anda saat ini.
        </p>
        <Link
          href="/board"
          className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Buka Papan Kanban</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    )
  }

  if (type === 'empty') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-border">
        <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-4">
          <Layers className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Belum ada Action Plan untuk Anda.
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          Action Plan yang ditugaskan ke Anda akan tampil di sini.
        </p>
        <Link
          href="/board"
          className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Buka Papan Kanban</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-border">
      <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
        <Layers className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-bold text-foreground">
        Pilih Action Plan
      </h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
        Klik Action Plan di daftar untuk melihat detail, checklist, dan bukti di sini.
      </p>
    </div>
  )
}
