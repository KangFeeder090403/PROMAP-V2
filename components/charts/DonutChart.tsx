import type { ActionPlanStatus } from '@/lib/generated/prisma/client'

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

function titleCase(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

const R = 60
const CX = 75
const CY = 75
const CIRCUMFERENCE = 2 * Math.PI * R

export function DonutChart({ data }: { data: { status: ActionPlanStatus; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return (
      <div>
        <svg viewBox="0 0 150 150" role="img" aria-label="Distribusi status Action Plan, total 0" className="mx-auto w-40 h-40">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E2E8F0" strokeWidth={20} />
        </svg>
        <p className="text-center text-xs text-slate-500 mt-2">Belum ada Action Plan</p>
      </div>
    )
  }

  let cumulative = 0
  const segments = data
    .filter((d) => d.count > 0)
    .map((d) => {
      const segLen = (d.count / total) * CIRCUMFERENCE
      const offset = -cumulative
      cumulative += segLen
      return { ...d, segLen, offset }
    })

  return (
    <div>
      <svg viewBox="0 0 150 150" role="img" aria-label={`Distribusi status Action Plan, total ${total}`} className="mx-auto w-40 h-40">
        <g transform="rotate(-90 75 75)">
          {segments.map((seg) => (
            <circle
              key={seg.status}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={STATUS_COLOR[seg.status]}
              strokeWidth={20}
              strokeDasharray={`${seg.segLen} ${CIRCUMFERENCE - seg.segLen}`}
              strokeDashoffset={seg.offset}
            />
          ))}
        </g>
      </svg>
      <ul className="mt-3 space-y-1.5">
        {data.filter((d) => d.count > 0).map((d) => (
          <li key={d.status} className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[d.status] }} />
            <span className="flex-1">{titleCase(d.status)}</span>
            <span className="font-medium text-slate-700">{d.count}</span>
            <span>({((d.count / total) * 100).toFixed(0)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
