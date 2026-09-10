import type { ActionPlanStatus, Priority, ProposalStatus, Role } from '@/lib/generated/prisma/client'

export type DashboardUser = {
  id: string
  name: string
  role: Role
  roleLabel: string
  divisionName: string | null
  companyName: string | null
  title: string | null
}

export type PicWorkload = {
  picId: string
  picName: string
  total: number
  overdue: number
  active: number
  review: number
  done: number
}

export type ActionRequiredItem = {
  id: string
  refCode: string
  kind: 'AP' | 'PROPOSAL'
  title: string
  status: ActionPlanStatus | ProposalStatus
  picName: string
  picId?: string
  proposerId?: string
  evidenceLink: string | null
  deadline: string | null
  createdAt: string | null
  description?: string | null
}

export type OverdueRow = {
  id: string
  refCode: string
  title: string
  subtitle: string | null
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  picId: string
  picName: string
  deadline: string
  createdAt: string | null
  lateDays: number
}

export type DashboardResponse = {
  metrics: {
    total: number
    complete: number
    completionRate: number
    inProgress: number
    inReview: number
    overdue: number
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
  picWorkload: PicWorkload[]
  actionRequired: ActionRequiredItem[]
  overdueList: OverdueRow[]
}

export type PortfolioSummary = {
  healthSummary: { onTrack: number; atRisk: number; delayed: number }
  projectHealth: {
    id: string
    name: string
    progress: number
    health: 'ON_TRACK' | 'AT_RISK' | 'DELAYED'
    taskCount: number
    overdueTasks: number
    endDate: string | null
  }[]
  divisionProgress: {
    id: string
    name: string
    total: number
    done: number
    overdue: number
    completionRate: number
    overdueRate: number
  }[]
  upcomingMilestones: {
    title: string
    projectId: string
    projectName: string
    divisionName: string
    endDate: string
    daysLeft: number
    status: string
  }[]
}

export type DashboardApiResponse = DashboardResponse & {
  user: DashboardUser
  greeting: string
  portfolio?: PortfolioSummary
}