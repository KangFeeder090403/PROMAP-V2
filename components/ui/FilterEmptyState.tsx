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
        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
          <Search className="h-9 w-9 stroke-[2.2]" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground ring-4 ring-background">
          !
        </div>
      </div>

      {/* Teks Heading & Subtitle */}
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
        {searchKeyword ? (
          <>
            Tidak ada data untuk kata kunci{' '}
            <span className="font-semibold text-foreground">
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
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Reset Semua Filter
        </button>

        {onRestoreDefaults && (
          <button
            type="button"
            onClick={onRestoreDefaults}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-input bg-card hover:bg-accent text-foreground text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RotateCcw className="h-4 w-4" />
            Kembalikan Default
          </button>
        )}
      </div>
    </div>
  )
}
