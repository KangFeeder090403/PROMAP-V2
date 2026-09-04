import type { ActionPlanStatus, Priority } from '@/lib/generated/prisma/client'

export type DashboardResponse = {
  metrics: {
    total: number
    complete: number
    inProgress: number
    overdue: number
    completionRate: number
  }
  statusBreakdown: { status: ActionPlanStatus; count: number }[]
  priorityBreakdown: { priority: Priority; count: number }[]
  picProductivity: {
    picId: string
    picName: string
    total: number
    complete: number
    completionRate: number
  }[]
}
