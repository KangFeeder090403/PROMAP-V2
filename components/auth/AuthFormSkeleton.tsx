export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="p-6">
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
            <div className="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-700" />
          </div>
        ))}
        <div className="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-700" />
      </div>
    </div>
  )
}
