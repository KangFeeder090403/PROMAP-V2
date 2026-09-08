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
        'bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[460px] overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  )
}
