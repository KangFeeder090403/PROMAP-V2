import { prisma } from '@/lib/prisma'
import { projectScope } from '@/lib/rbac'
import type { User } from '@/lib/generated/prisma/client'
import { unstable_cache } from 'next/cache'

export interface ProjectQueryResult {
  id: string
  name: string
  description: string | null
  companyId: string
  divisionId: string | null
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
  company?: { id: string; name: string } | null
  division: { id: string; name: string } | null
  divisions: { id: string; name: string }[]
  taskCount: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  actionPlanCount: number
}

export async function fetchProjectsDataRaw(
  user: User,
  options?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<ProjectQueryResult[]> {
  const sortBy = options?.sortBy || 'createdAt'
  const sortOrder = options?.sortOrder === 'asc' ? 'asc' : 'desc'

  const allowedSortFields = ['createdAt', 'name', 'startDate', 'endDate']
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'

  const projects = await prisma.project.findMany({
    where: { ...projectScope(user), deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      companyId: true,
      divisionId: true,
      isActive: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      company: { select: { id: true, name: true } },
    },
    orderBy: { [safeSortBy]: sortOrder },
  })

  const ids = projects.map((p) => p.id)

  const tasks = ids.length
    ? await prisma.task.findMany({
        where: { projectId: { in: ids }, deletedAt: null },
        select: { id: true, projectId: true, status: true, endDate: true, divisionId: true },
      })
    : []

  const taskIds = tasks.map((t) => t.id)
  const actionPlans = taskIds.length
    ? await prisma.actionPlan.findMany({
        where: { taskId: { in: taskIds }, deletedAt: null },
        select: { id: true, taskId: true },
      })
    : []

  const taskByProject = new Map<string, typeof tasks>()
  for (const t of tasks) {
    const list = taskByProject.get(t.projectId) ?? []
    list.push(t)
    taskByProject.set(t.projectId, list)
  }

  const taskIdToProject = new Map(tasks.map((t) => [t.id, t.projectId]))
  const apCountByProject = new Map<string, number>()
  for (const ap of actionPlans) {
    if (!ap.taskId) continue
    const projectId = taskIdToProject.get(ap.taskId)
    if (!projectId) continue
    apCountByProject.set(projectId, (apCountByProject.get(projectId) ?? 0) + 1)
  }

  const divisionIds = [
    ...new Set([
      ...projects.map((p) => p.divisionId),
      ...tasks.map((t) => t.divisionId),
    ].filter(Boolean)),
  ] as string[]

  const divisions = divisionIds.length
    ? await prisma.division.findMany({
        where: { id: { in: divisionIds } },
        select: { id: true, name: true },
      })
    : []
  const divisionMap = new Map(divisions.map((d) => [d.id, d]))

  const now = new Date()

  return projects.map((p) => {
    const ts = taskByProject.get(p.id) ?? []
    const completedTasks = ts.filter((t) => t.status === 'COMPLETE' || t.status === 'APPROVED').length
    const inProgressTasks = ts.filter((t) => t.status === 'IN_PROGRESS').length
    const overdueTasks = ts.filter((t) => {
      if (t.status === 'OVERDUE') return true
      if (t.status !== 'COMPLETE' && t.status !== 'APPROVED' && t.endDate && new Date(t.endDate) < now) {
        return true
      }
      return false
    }).length

    const divisionSet = new Map<string, { id: string; name: string }>()
    if (p.divisionId && divisionMap.has(p.divisionId)) {
      divisionSet.set(p.divisionId, divisionMap.get(p.divisionId)!)
    }
    for (const t of ts) {
      const d = divisionMap.get(t.divisionId)
      if (d) divisionSet.set(d.id, d)
    }

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      companyId: p.companyId,
      divisionId: p.divisionId,
      isActive: p.isActive,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      company: p.company,
      division: p.divisionId ? (divisionMap.get(p.divisionId) ?? null) : null,
      divisions: [...divisionSet.values()],
      taskCount: ts.length,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      actionPlanCount: apCountByProject.get(p.id) ?? 0,
    }
  })
}

/**
 * Cached version of getProjectsData using unstable_cache
 */
export async function getProjectsData(
  user: User,
  options?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<ProjectQueryResult[]> {
  const cacheKey = [
    'projects-list',
    user.role,
    user.companyId ?? 'all',
    user.divisionId ?? 'all',
    user.id,
    options?.sortBy ?? 'createdAt',
    options?.sortOrder ?? 'desc',
  ]

  return unstable_cache(
    async () => fetchProjectsDataRaw(user, options),
    cacheKey,
    {
      revalidate: 60, // Cache for 60 seconds
      tags: [`projects-${user.companyId ?? 'all'}`],
    }
  )()
}
