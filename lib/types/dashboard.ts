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

/** Baris tabel tracker Home — AP belum COMPLETE, urut OVERDUE dulu lalu deadline. */
export type TrackerRow = {
  id: string
  refCode: string
  title: string
  picName: string
  priority: Priority
  status: ActionPlanStatus
  startDate: string | null
  deadline: string | null
  checklistDone: number
  checklistTotal: number
}

export type DashboardResponse = {
  metrics: {
    total: number
    complete: number
    completionRate: number
    inProgress: number
    inReview: number
    overdue: number
    /** % AP COMPLETE dalam window yang selesai <= akhir hari tenggat (WIB). null = tak ada data. */
    onTimeRate?: number | null
    /** Sumber tanggal selesai: ActivityLog (fromLog) atau fallback updatedAt (fromUpdatedAt). */
    onTimeBasis?: { total: number; fromLog: number; fromUpdatedAt: number }
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
  tracker?: TrackerRow[]
}

export type ProjectHealth = 'ON_TRACK' | 'AT_RISK' | 'DELAYED'
export type MilestoneUrgency = 'CRITICAL' | 'UPCOMING' | 'HORIZON'

export type UpcomingMilestone = {
  title: string
  projectId: string
  projectName: string
  divisionName: string
  picName: string | null
  endDate: string
  daysLeft: number
  status: string
  urgency: MilestoneUrgency
}

export type PortfolioSummary = {
  healthSummary: { onTrack: number; atRisk: number; delayed: number }
  projectHealth: {
    id: string
    name: string
    divisionName: string
    progress: number
    health: ProjectHealth
    taskCount: number
    overdueTasks: number
    startDate: string | null
    endDate: string | null
    createdAt: string
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
  upcomingMilestones: UpcomingMilestone[]
}

export type DashboardApiResponse = DashboardResponse & {
  user: DashboardUser
  greeting: string
  portfolio?: PortfolioSummary
}