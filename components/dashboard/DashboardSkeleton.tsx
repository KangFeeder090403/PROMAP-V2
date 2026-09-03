export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-slate-200 rounded-lg h-24" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="animate-pulse bg-slate-200 rounded-lg h-80" />
        <div className="animate-pulse bg-slate-200 rounded-lg h-80" />
      </div>
      <div className="animate-pulse bg-slate-200 rounded-lg h-64" />
    </div>
  )
}
