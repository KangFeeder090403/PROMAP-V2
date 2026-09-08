export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div>
      <div className="h-8 bg-slate-100 rounded animate-pulse mb-6 w-32" />
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
        <div className="h-9 bg-slate-100 rounded animate-pulse" />
      </div>
    </div>
  )
}
