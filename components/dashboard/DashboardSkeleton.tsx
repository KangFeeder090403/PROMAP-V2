export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5 h-24" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg h-32" />
        ))}
      </div>
      <div className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg h-40" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg h-72" />
        <div className="lg:col-span-7 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg h-72" />
      </div>
      <div className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg h-56" />
    </div>
  )
}