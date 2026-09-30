import { Skeleton } from '@/components/ui/skeleton'

export default function ProjectsLoading() {
  return (
    <div className="space-y-5">
      {/* ── Filter Toolbar Skeleton ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* ── Table Card Skeleton ── */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-7 gap-4 px-5 py-3.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="h-4 w-28 col-span-2" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12 ml-auto" />
        </div>

        {/* 5 Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-4 px-5 py-4 items-center">
              <div className="col-span-2 space-y-1.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div>
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <div>
                <Skeleton className="h-3.5 w-24" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
