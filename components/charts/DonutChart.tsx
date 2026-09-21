import type { ActionPlanStatus } from '@/lib/generated/prisma/client'
import { AP_STATUS_LABEL } from '@/lib/status-labels'

const STATUS_COLOR: Record<ActionPlanStatus, string> = {
  NOT_STARTED: '#94A3B8',
  IN_PROGRESS: '#3B82F6',
  PENDING_APPROVAL: '#6366F1',
  EVIDENCE_REQUIRED: '#F59E0B',
  APPROVED: '#22C55E',
  REJECTED: '#EF4444',
  OVERDUE: '#F59E0B',
  COMPLETE: '#10B981',
}

const R = 60
const CX = 75
const CY = 75
const CIRCUMFERENCE = 2 * Math.PI * R

export function DonutChart({
  data,
  center,
  legendLayout = 'list',
}: {
  data: { status: ActionPlanStatus; count: number }[]
  center?: { value: string | number; label: string }
  legendLayout?: 'list' | 'grid'
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const visible = data.filter((d) => d.count > 0)

  return (
    <div className={legendLayout === 'grid' ? 'flex flex-col sm:flex-row items-center justify-center gap-6' : ''}>
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 150 150" role="img" aria-label={`Distribusi status Action Plan, total ${total}`} className="w-full h-full">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E2E8F0" strokeWidth={20} />
          {total > 0 &&
            (() => {
              let cumulative = 0
              return visible.map((d) => {
                const segLen = (d.count / total) * CIRCUMFERENCE
                const offset = -cumulative
                cumulative += segLen
                return (
                  <circle
                    key={d.status}
                    cx={CX}
                    cy={CY}
                    r={R}
                    fill="none"
                    stroke={STATUS_COLOR[d.status]}
                    strokeWidth={20}
                    strokeDasharray={`${segLen} ${CIRCUMFERENCE - segLen}`}
                    strokeDashoffset={offset}
                  />
                )
              })
            })()}
        </svg>
        {center && total > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 leading-none">{center.value}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">{center.label}</span>
          </div>
        )}
      </div>

      {total === 0 ? (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">Belum ada Action Plan</p>
      ) : legendLayout === 'grid' ? (
        <ul className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 w-full text-sm">
          {visible.map((d) => (
            <li key={d.status} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[d.status] }} />
                <span className="truncate">{AP_STATUS_LABEL[d.status]}</span>
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{d.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {visible.map((d) => (
            <li key={d.status} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[d.status] }} />
              <span className="flex-1">{AP_STATUS_LABEL[d.status]}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{d.count}</span>
              <span>({((d.count / total) * 100).toFixed(0)}%)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}