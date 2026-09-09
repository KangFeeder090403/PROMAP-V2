export function MyWorkSkeleton() {
  const pulse = 'animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/70'
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className={`${pulse} h-5 w-40`} />
        <div className={`${pulse} h-4 w-80 max-w-full`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className={`${pulse} h-32 w-full`} />
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className={`${pulse} h-4 w-48`} />
            <div className="mt-4 space-y-3">
              <div className={`${pulse} h-14 w-full`} />
              <div className={`${pulse} h-14 w-full`} />
              <div className={`${pulse} h-14 w-full`} />
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className={`${pulse} h-64 w-full`} />
          <div className={`${pulse} h-40 w-full`} />
          <div className={`${pulse} h-36 w-full`} />
        </div>
      </div>
    </div>
  )
}