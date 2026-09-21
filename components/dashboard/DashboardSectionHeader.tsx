import React from 'react'

interface DashboardSectionHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function DashboardSectionHeader({
  icon,
  title,
  subtitle,
  badge,
  action,
  className = '',
}: DashboardSectionHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
              {title}
            </h3>
            {badge}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
