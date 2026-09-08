import { cn } from '@/lib/utils'

export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800',
        className
      )}
    >
      {children}
    </div>
  )
}
