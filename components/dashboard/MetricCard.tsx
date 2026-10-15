import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function MetricCard({
  label,
  value,
  valueClass,
  icon: Icon,
  iconClass,
  badge,
  progress,
  progressClass = 'bg-primary',
  footer,
}: {
  label: string
  value: ReactNode
  valueClass?: string
  icon: LucideIcon
  iconClass: string
  badge?: ReactNode
  progress?: number
  progressClass?: string
  footer?: ReactNode
}) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-4 flex flex-col justify-between min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium truncate">{label}</p>
        <span className={`p-1.5 rounded-md flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <p className={`text-2xl font-bold text-foreground leading-none tabular-nums ${valueClass ?? ''}`}>{value}</p>
        {badge}
      </div>

      {typeof progress === 'number' && (
        <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full ${progressClass}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      {footer && <div className="mt-2 text-xs text-muted-foreground truncate">{footer}</div>}
    </div>
  )
}
