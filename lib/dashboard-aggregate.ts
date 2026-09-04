import type { ActionPlanStatus, Priority } from '@/lib/generated/prisma/client'
import type { DashboardResponse } from '@/lib/types/dashboard'

const ALL_STATUSES: ActionPlanStatus[] = [
  'NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'EVIDENCE_REQUIRED',
  'APPROVED', 'REJECTED', 'OVERDUE', 'COMPLETE',
]
const ALL_PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW']

export type APRow = {
  status: ActionPlanStatus
  priority: Priority
  picId: string
  pic: { name: string }
}

/** Pure aggregation — testable tanpa DB (lihat scripts/check-dashboard-aggregate.ts). */
export function aggregateDashboard(actionPlans: APRow[]): DashboardResponse {
  const total = actionPlans.length
  const complete = actionPlans.filter((ap) => ap.status === 'COMPLETE').length
  const inProgress = actionPlans.filter((ap) => ap.status === 'IN_PROGRESS').length
  const overdue = actionPlans.filter((ap) => ap.status === 'OVERDUE').length

  const statusBreakdown = ALL_STATUSES.map((status) => ({
    status,
    count: actionPlans.filter((ap) => ap.status === status).length,
  }))

  const priorityBreakdown = ALL_PRIORITIES.map((priority) => ({
    priority,
    count: actionPlans.filter((ap) => ap.priority === priority).length,
  }))

  const picMap = new Map<string, { picName: string; total: number; complete: number }>()
  for (const ap of actionPlans) {
    const entry = picMap.get(ap.picId) ?? { picName: ap.pic.name, total: 0, complete: 0 }
    entry.total += 1
    if (ap.status === 'COMPLETE') entry.complete += 1
    picMap.set(ap.picId, entry)
  }
  const picProductivity = Array.from(picMap.entries())
    .map(([picId, v]) => ({
      picId,
      picName: v.picName,
      total: v.total,
      complete: v.complete,
      completionRate: v.total > 0 ? (v.complete / v.total) * 100 : 0,
    }))
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 10)

  return {
    metrics: {
      total,
      complete,
      inProgress,
      overdue,
      completionRate: total > 0 ? (complete / total) * 100 : 0,
    },
    statusBreakdown,
    priorityBreakdown,
    picProductivity,
  }
}
