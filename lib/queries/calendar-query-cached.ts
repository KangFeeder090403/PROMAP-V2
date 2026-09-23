import { prisma } from '@/lib/prisma'
import { projectScope, divisionScope } from '@/lib/rbac'
import type { User } from '@/lib/generated/prisma/client'
import { shortRef } from '@/lib/dashboard-aggregate'
import { buildCalendarWhere } from '@/lib/calendar-query'
import { resolveCalendarRange, type CalendarEvent } from '@/lib/calendar-grid'
import { AP_STATUS_LABEL, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import { unstable_cache } from 'next/cache'

export interface CalendarFilterOptions {
  statuses: { key: string; label: string }[]
  priorities: { key: string; label: string }[]
  pics: { id: string; name: string; division?: { name: string } | null }[]
  projects: { id: string; name: string }[]
  divisions: { id: string; name: string }[]
}

export async function fetchCalendarFilterOptionsRaw(user: User): Promise<CalendarFilterOptions> {
  const statuses = [
    'NOT_STARTED',
    'IN_PROGRESS',
    'PENDING_APPROVAL',
    'EVIDENCE_REQUIRED',
    'APPROVED',
    'REJECTED',
    'OVERDUE',
    'COMPLETE',
  ].map((key) => ({
    key,
    label: AP_STATUS_LABEL[key] ?? key,
  }))

  const priorities = ['HIGH', 'MEDIUM', 'LOW'].map((key) => ({
    key,
    label: AP_PRIORITY_LABEL[key] ?? key,
  }))

  const [pics, projects, divisions] = await Promise.all([
    prisma.user.findMany({
      where: {
        companyId: user.companyId ?? undefined,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        division: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.project.findMany({
      where: {
        ...projectScope(user),
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.division.findMany({
      where: {
        ...divisionScope(user),
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return {
    statuses,
    priorities,
    pics,
    projects: [
      { id: 'personal', name: 'Personal (Tanpa Project)' },
      ...projects,
    ],
    divisions,
  }
}

export async function getCalendarFilterOptions(user: User): Promise<CalendarFilterOptions> {
  const cacheKey = [
    'calendar-filters',
    user.role,
    user.companyId ?? 'all',
    user.divisionId ?? 'all',
  ]

  return unstable_cache(
    async () => fetchCalendarFilterOptionsRaw(user),
    cacheKey,
    {
      revalidate: 120, // 2 minutes
      tags: [`calendar-filters-${user.companyId ?? 'all'}`],
    }
  )()
}

export async function getCalendarEvents(
  user: User,
  from: Date,
  to: Date,
  filters?: {
    status?: string | null
    priority?: string | null
    divisionId?: string | null
    picId?: string | null
    projectId?: string | null
  }
): Promise<CalendarEvent[]> {
  const where = buildCalendarWhere(user, from, to, filters)

  const data = await prisma.actionPlan.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      startDate: true,
      endDate: true,
      picId: true,
      divisionId: true,
      pic: { select: { id: true, name: true, userLabel: { select: { name: true } } } },
      task: { select: { projectId: true, project: { select: { id: true, name: true } } } },
      division: { select: { id: true, name: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  return data.map((ap) => ({
    id: ap.id,
    code: shortRef(ap.id, 'AP'),
    title: ap.title,
    status: ap.status,
    priority: ap.priority,
    startDate: ap.startDate.toISOString(),
    endDate: ap.endDate.toISOString(),
    picId: ap.picId,
    picName: ap.pic.name,
    labelName: ap.pic.userLabel?.name ?? '-',
    projectId: ap.task?.projectId ?? ap.task?.project?.id ?? null,
    projectName: ap.task?.project?.name ?? 'Personal',
    divisionId: ap.divisionId ?? ap.division?.id ?? null,
    divisionName: ap.division?.name ?? '-',
  }))
}

export async function getCalendarInitialData(user: User) {
  const now = new Date()
  const range = resolveCalendarRange('month', now)
  const from = new Date(range.from)
  const to = new Date(range.to)

  const [filterOptions, events] = await Promise.all([
    getCalendarFilterOptions(user),
    getCalendarEvents(user, from, to),
  ])

  return { filterOptions, events }
}
