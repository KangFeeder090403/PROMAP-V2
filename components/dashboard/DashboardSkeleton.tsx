const box = 'animate-pulse bg-card rounded-lg border border-border shadow-sm dark:shadow-none w-full min-w-0'

/** Mengikuti grid one-page DashboardClient: header, 6 KPI, chart, tracker, timeline. */
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full min-w-0" aria-busy="true" aria-label="Memuat dashboard">
      <div className={`${box} xl:col-span-12 h-24`} />
      <div className="xl:col-span-12 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 min-w-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${box} h-24`} />
        ))}
      </div>
      <div className={`${box} xl:col-span-6 2xl:col-span-3 h-72`} />
      <div className={`${box} xl:col-span-6 2xl:col-span-3 h-72`} />
      <div className={`${box} xl:col-span-12 2xl:col-span-6 h-72`} />
      <div className={`${box} xl:col-span-8 h-96`} />
      <div className={`${box} xl:col-span-4 h-96`} />
      <div className={`${box} xl:col-span-8 h-64`} />
      <div className={`${box} xl:col-span-4 h-64`} />
    </div>
  )
}
