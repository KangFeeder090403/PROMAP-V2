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
  progressClass = 'bg-emerald-500',
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
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between relative overflow-hidden">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <span className={`p-2 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className={`text-3xl font-bold text-slate-900 dark:text-slate-50 leading-none ${valueClass ?? ''}`}>{value}</p>
        {badge}
      </div>

      {typeof progress === 'number' && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full ${progressClass}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      {footer && <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">{footer}</div>}
    </div>
  )
}