// Agregasi "helicopter view" untuk Dashboard: kesehatan proyek, perbandingan
// lintas divisi, dan milestone 14 hari.
// Murni fungsi — tidak menyentuh Prisma, supaya bisa diuji tanpa DB.

import type {
  PortfolioSummary,
  ProjectHealth,
  MilestoneUrgency,
  UpcomingMilestone,
} from '@/lib/types/dashboard'

export type { ProjectHealth, MilestoneUrgency, UpcomingMilestone }

export interface PortfolioProject {
  id: string
  name: string
  startDate?: Date | null
  endDate: Date | null
  createdAt?: Date
  divisionId: string | null
}

export interface PortfolioTask {
  projectId: string
  divisionId: string
  title: string
  status: string
  endDate: Date | null
  picName?: string | null
}

const DONE = ['COMPLETE', 'APPROVED']
const DAY_MS = 86_400_000

/** Horizon radar tenggat — 14 hari, sesuai kebutuhan mitigasi pimpinan. */
export const MILESTONE_HORIZON_DAYS = 14

function isOverdue(t: PortfolioTask, now: Date) {
  if (DONE.includes(t.status)) return false
  return t.status === 'OVERDUE' || (t.endDate !== null && t.endDate < now)
}

export function buildPortfolio(
  projects: PortfolioProject[],
  tasks: PortfolioTask[],
  divisionNames: Map<string, string>,
  now = new Date()
): PortfolioSummary {
  const byProject = new Map<string, PortfolioTask[]>()
  for (const t of tasks) {
    const list = byProject.get(t.projectId) ?? []
    list.push(t)
    byProject.set(t.projectId, list)
  }

  // 1. Evaluasi Kesehatan Proyek
  const projectHealth = projects.map((p) => {
    const ts = byProject.get(p.id) ?? []
    const done = ts.filter((t) => DONE.includes(t.status)).length
    const overdue = ts.filter((t) => isOverdue(t, now)).length
    const progress = ts.length > 0 ? Math.round((done / ts.length) * 100) : 0

    const projectLate = p.endDate !== null && p.endDate < now && progress < 100
    const deadlineSoon =
      p.endDate !== null && p.endDate >= now && p.endDate.getTime() - now.getTime() <= 7 * DAY_MS

    let health: ProjectHealth = 'ON_TRACK'
    if (overdue > 0 || projectLate) health = 'DELAYED'
    else if (deadlineSoon && progress < 70) health = 'AT_RISK'

    const divisionName = p.divisionId ? (divisionNames.get(p.divisionId) ?? 'Umum') : 'Lintas Divisi'

    return {
      id: p.id,
      name: p.name,
      divisionName,
      progress,
      health,
      taskCount: ts.length,
      overdueTasks: overdue,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
      createdAt: (p.createdAt ?? now).toISOString(),
    }
  })

  const healthSummary = {
    onTrack: projectHealth.filter((p) => p.health === 'ON_TRACK').length,
    atRisk: projectHealth.filter((p) => p.health === 'AT_RISK').length,
    delayed: projectHealth.filter((p) => p.health === 'DELAYED').length,
  }

  // 2. Progres & Performa Lintas Divisi
  const divAgg = new Map<string, { total: number; done: number; overdue: number }>()
  for (const t of tasks) {
    const row = divAgg.get(t.divisionId) ?? { total: 0, done: 0, overdue: 0 }
    row.total += 1
    if (DONE.includes(t.status)) row.done += 1
    if (isOverdue(t, now)) row.overdue += 1
    divAgg.set(t.divisionId, row)
  }

  const divisionProgress = [...divAgg.entries()]
    .map(([id, r]) => ({
      id,
      name: divisionNames.get(id) ?? 'Tanpa Divisi',
      total: r.total,
      done: r.done,
      overdue: r.overdue,
      completionRate: r.total > 0 ? Math.round((r.done / r.total) * 100) : 0,
      overdueRate: r.total > 0 ? Math.round((r.overdue / r.total) * 100) : 0,
    }))
    .sort((a, b) => b.completionRate - a.completionRate)

  // 3. Milestone 14 Hari Ke Depan
  const horizonEnd = new Date(now.getTime() + MILESTONE_HORIZON_DAYS * DAY_MS)
  const allMilestones: UpcomingMilestone[] = tasks
    .filter(
      (t) =>
        !DONE.includes(t.status) &&
        t.endDate !== null &&
        t.endDate >= now &&
        t.endDate <= horizonEnd
    )
    .map((t) => {
      const daysLeft = Math.ceil((t.endDate!.getTime() - now.getTime()) / DAY_MS)
      let urgency: MilestoneUrgency = 'HORIZON'
      if (daysLeft <= 3) urgency = 'CRITICAL'
      else if (daysLeft <= 7) urgency = 'UPCOMING'

      return {
        title: t.title,
        projectId: t.projectId,
        projectName: projects.find((p) => p.id === t.projectId)?.name ?? '—',
        divisionName: divisionNames.get(t.divisionId) ?? 'Tanpa Divisi',
        picName: t.picName ?? null,
        endDate: t.endDate!.toISOString(),
        daysLeft,
        status: t.status,
        urgency,
      }
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate))

  const upcomingMilestones = allMilestones.slice(0, 10)

  return {
    healthSummary,
    projectHealth,
    divisionProgress,
    upcomingMilestones,
  }
}
