export function MyWorkSkeleton() {
  const pulse = 'animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70'
  return (
    <div className="space-y-5">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className={`${pulse} h-4 w-36`} />
        <div className={`${pulse} h-6 w-56`} />
        <div className={`${pulse} h-4 w-96 max-w-full`} />
      </div>

      {/* Telemetry Bar Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${pulse} h-14 w-full`} />
        <div className={`${pulse} h-14 w-full`} />
        <div className={`${pulse} h-14 w-full`} />
        <div className={`${pulse} h-14 w-full`} />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2">
        <div className={`${pulse} h-8 w-24 rounded-full`} />
        <div className={`${pulse} h-8 w-32 rounded-full`} />
        <div className={`${pulse} h-8 w-36 rounded-full`} />
        <div className={`${pulse} h-8 w-24 rounded-full`} />
      </div>

      {/* Split-Screen Grid Skeleton */}
      <div className="grid gap-6 xl:grid-cols-12 min-h-[500px]">
        {/* Kolom Kiri: Daftar Kartu */}
        <div className="space-y-3 xl:col-span-5">
          <div className={`${pulse} h-20 w-full`} />
          <div className={`${pulse} h-24 w-full`} />
          <div className={`${pulse} h-24 w-full`} />
          <div className={`${pulse} h-24 w-full`} />
        </div>

        {/* Kolom Kanan: Workstation Inspector Skeleton */}
        <div className="hidden xl:block xl:col-span-7">
          <div className={`${pulse} h-full min-h-[460px] w-full`} />
        </div>
      </div>
    </div>
  )
}
