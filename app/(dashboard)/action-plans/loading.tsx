import { Skeleton } from '@/components/ui/skeleton'

export default function ActionPlansLoading() {
  return (
    <div className="space-y-4">
      {/* ── Header Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* ── Table Skeleton ── */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-8 gap-4 px-5 py-3.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="h-3.5 w-24 col-span-2" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-12 ml-auto" />
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="grid grid-cols-8 gap-4 px-5 py-4 items-center">
              <div className="col-span-2 space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3.5 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
              <div className="flex justify-end">
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
