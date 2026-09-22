import { Skeleton } from '@/components/ui/skeleton'

export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      {/* ── Top Header Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* ── Main Layout: Calendar Grid + Right Sidebar ── */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        {/* Calendar Grid Skeleton */}
        <div className="flex-1 w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
          {/* Weekday headers (7 columns) */}
          <div className="grid grid-cols-7 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
              <div key={day} className="text-center">
                <Skeleton className="h-4 w-10 mx-auto" />
              </div>
            ))}
          </div>

          {/* Month days grid (5 rows x 7 cols = 35 cells) */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="h-24 sm:h-28 rounded-lg border border-slate-100 dark:border-slate-800/80 p-2 flex flex-col justify-between"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-5 rounded" />
                </div>
                {i % 3 === 0 && <Skeleton className="h-4 w-full rounded" />}
                {i % 4 === 0 && <Skeleton className="h-4 w-3/4 rounded" />}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Skeleton */}
        <div className="w-full xl:w-72 shrink-0 space-y-4">
          {/* Upcoming Deadlines */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center mb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>

          {/* Milestone Progress */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
