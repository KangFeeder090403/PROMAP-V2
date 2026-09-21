export function DashboardSkeleton() {
  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Contextual Banner Header */}
      <div className="animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 h-20 w-full" />

      {/* Tier 1: Executive Narrative Digest Skeleton */}
      <div className="animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-7 space-y-6 w-full">
        {/* Header Greeting & Headline */}
        <div className="space-y-2.5">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48" />
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-72" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full max-w-3xl" />
        </div>

        {/* 4 Integrated Pillars */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-3" />
          ))}
        </div>

        {/* 3 Narrative Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-36" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Tier 2: Project Flightpath Roadmap Skeleton */}
      <div className="animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 w-full">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-56" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-80" />
          </div>
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-32" />
        </div>
        <div className="space-y-3 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Tier 3: Cockpit Grid (Velocity vs Action Radar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 h-72 w-full" />
        <div className="animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 h-72 w-full" />
      </div>

      {/* Tier 4: Operational Status & Priority Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full">
        <div className="xl:col-span-5 animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 h-72 w-full" />
        <div className="xl:col-span-7 animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 h-72 w-full" />
      </div>
    </div>
  )
}
