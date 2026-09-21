'use client'

import { SlidersHorizontal, RotateCcw, Search } from 'lucide-react'

export interface FilterEmptyStateProps {
  /** Jumlah filter aktif saat ini */
  activeFilterCount?: number
  /** Kata kunci pencarian aktif */
  searchKeyword?: string
  /** Handler untuk Reset Semua Filter */
  onReset: () => void
  /** Handler untuk Kembalikan Default */
  onRestoreDefaults?: () => void
  title?: string
  description?: string
}

export function FilterEmptyState({
  searchKeyword,
  onReset,
  onRestoreDefaults,
  title = 'Tidak ada data yang sesuai dengan filter',
  description = 'Coba ubah kata kunci pencarian atau bersihkan beberapa kriteria filter yang aktif',
}: FilterEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Keadaan 3: Ilustrasi Kaca Pembesar dengan Badge Tanda Seru Merah (!) */}
      <div className="relative mb-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-blue-500 dark:text-blue-400 shadow-sm">
          <Search className="h-9 w-9 stroke-[2.2]" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white ring-4 ring-white dark:ring-slate-900 shadow-sm">
          !
        </div>
      </div>

      {/* Teks Heading & Subtitle */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
        {searchKeyword ? (
          <>
            Tidak ada data untuk kata kunci{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              &ldquo;{searchKeyword}&rdquo;
            </span>
            .{' '}
          </>
        ) : null}
        {description}
      </p>

      {/* Keadaan 3 Actions: [Reset Semua Filter] & [Kembalikan Default] */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Reset Semua Filter
        </button>

        {onRestoreDefaults && (
          <button
            type="button"
            onClick={onRestoreDefaults}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors shadow-xs"
          >
            <RotateCcw className="h-4 w-4" />
            Kembalikan Default
          </button>
        )}
      </div>
    </div>
  )
}
