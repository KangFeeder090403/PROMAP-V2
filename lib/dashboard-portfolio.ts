// Agregasi "helicopter view" untuk Dashboard: kesehatan proyek, perbandingan
// lintas divisi, sintesis naratif eksekutif, dan radar timeline horizon.
// Murni fungsi — tidak menyentuh Prisma, supaya bisa diuji tanpa DB.

import type {
  PortfolioSummary,
  ProjectHealth,
  MilestoneUrgency,
  UpcomingMilestone,
  BottleneckSummary,
  ExecutiveDigest,
} from '@/lib/types/dashboard'

export type { ProjectHealth, MilestoneUrgency, UpcomingMilestone, BottleneckSummary, ExecutiveDigest }

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

export interface PortfolioContextOptions {
  pendingProposalsCount?: number
  pendingReviewApCount?: number
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
  now = new Date(),
  options: PortfolioContextOptions = {}
): PortfolioSummary {
  const byProject = new Map<string, PortfolioTask[]>()
  for (const t of tasks) {
    const list = byProject.get(t.projectId) ?? []
    list.push(t)
    byProject.set(t.projectId, list)
  }

  // 1. Hitung Horizon Waktu Global (Timeline Horizon)
  let minTime = now.getTime() - 14 * DAY_MS
  let maxTime = now.getTime() + 60 * DAY_MS

  for (const p of projects) {
    const pStart = p.startDate ? p.startDate.getTime() : p.createdAt ? p.createdAt.getTime() : now.getTime()
    const pEnd = p.endDate ? p.endDate.getTime() : pStart + 30 * DAY_MS
    if (pStart < minTime) minTime = pStart
    if (pEnd > maxTime) maxTime = pEnd
  }

  // Pastikan ada rentang minimal 30 hari
  if (maxTime - minTime < 30 * DAY_MS) {
    maxTime = minTime + 30 * DAY_MS
  }

  const totalDuration = maxTime - minTime
  const todayPositionPercent = Math.max(0, Math.min(100, Math.round(((now.getTime() - minTime) / totalDuration) * 100)))

  // 2. Evaluasi Kesehatan Proyek & Koordinat Roadmap
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

    const pStart = p.startDate ? p.startDate.getTime() : p.createdAt ? p.createdAt.getTime() : now.getTime()
    const pEnd = p.endDate ? p.endDate.getTime() : pStart + 30 * DAY_MS

    const timelineStartPercent = Math.max(
      0,
      Math.min(95, Math.round(((pStart - minTime) / totalDuration) * 100))
    )
    const rawWidth = Math.round(((Math.max(pEnd, pStart + DAY_MS) - pStart) / totalDuration) * 100)
    const timelineWidthPercent = Math.max(6, Math.min(100 - timelineStartPercent, rawWidth))

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
      timelineStartPercent,
      timelineWidthPercent,
    }
  })

  const healthSummary = {
    onTrack: projectHealth.filter((p) => p.health === 'ON_TRACK').length,
    atRisk: projectHealth.filter((p) => p.health === 'AT_RISK').length,
    delayed: projectHealth.filter((p) => p.health === 'DELAYED').length,
  }

  // 3. Progres & Performa Lintas Divisi
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

  const totalTasks = tasks.length
  const totalOverdueTasks = tasks.filter((t) => isOverdue(t, now)).length
  const predictabilityScore =
    totalTasks > 0
      ? Math.max(0, Math.round(((totalTasks - totalOverdueTasks) / totalTasks) * 100))
      : 100

  const bottleneckCandidate = [...divisionProgress]
    .filter((d) => d.overdue > 0)
    .sort((a, b) => b.overdueRate - a.overdueRate || b.overdue - a.overdue)[0]

  const bottleneckSummary: BottleneckSummary = bottleneckCandidate
    ? {
        divisionId: bottleneckCandidate.id,
        divisionName: bottleneckCandidate.name,
        overdueCount: bottleneckCandidate.overdue,
        overdueRate: bottleneckCandidate.overdueRate,
      }
    : null

  // 4. Milestone 14 Hari Ke Depan
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

  const temporalMilestones = {
    critical: allMilestones.filter((m) => m.urgency === 'CRITICAL'),
    upcoming: allMilestones.filter((m) => m.urgency === 'UPCOMING'),
    horizon: allMilestones.filter((m) => m.urgency === 'HORIZON'),
  }

  const upcomingMilestones = allMilestones.slice(0, 10)

  // 5. Sintesis Naratif Eksekutif (Executive Narrative Digest)
  const totalProjects = projects.length
  const healthScore =
    totalProjects > 0
      ? Math.round(((healthSummary.onTrack * 1.0 + healthSummary.atRisk * 0.5) / totalProjects) * 100)
      : 100

  const keyBlockers: string[] = []
  const delayedProjects = projectHealth.filter((p) => p.health === 'DELAYED')
  if (delayedProjects.length > 0) {
    const names = delayedProjects.slice(0, 2).map((p) => p.name).join(', ')
    keyBlockers.push(
      `${delayedProjects.length} proyek mengalami keterlambatan (${names}${delayedProjects.length > 2 ? '...' : ''}) dengan total ${delayedProjects.reduce((acc, p) => acc + p.overdueTasks, 0)} tugas lewat tenggat.`
    )
  }
  if (bottleneckSummary) {
    keyBlockers.push(
      `Divisi ${bottleneckSummary.divisionName} mengalami kendala dengan ${bottleneckSummary.overdueCount} tugas terlambat (${bottleneckSummary.overdueRate}% keterlambatan).`
    )
  }
  if (temporalMilestones.critical.length > 0) {
    keyBlockers.push(
      `${temporalMilestones.critical.length} tugas mendekati tenggat kritis (jatuh tempo dalam ≤ 3 hari).`
    )
  }
  if (keyBlockers.length === 0) {
    keyBlockers.push('Tidak ada kendala atau keterlambatan jadwal pada seluruh proyek aktif.')
  }

  const keyMilestones: string[] = []
  const completedProjects = projectHealth.filter((p) => p.progress === 100)
  if (completedProjects.length > 0) {
    keyMilestones.push(`${completedProjects.length} proyek telah selesai 100%.`)
  }
  const topDivision = divisionProgress[0]
  if (topDivision && topDivision.total > 0) {
    keyMilestones.push(
      `Divisi ${topDivision.name} mencatat kinerja tertinggi dengan penyelesaian ${topDivision.completionRate}% (${topDivision.done}/${topDivision.total} tugas).`
    )
  }
  if (allMilestones.length > 0) {
    keyMilestones.push(`${allMilestones.length} target tugas terjadwal dalam 14 hari ke depan.`)
  }
  if (keyMilestones.length === 0) {
    keyMilestones.push('Seluruh proyek berjalan stabil sesuai rencana.')
  }

  const urgentDecisions: string[] = []
  const pendingProposals = options.pendingProposalsCount ?? 0
  const pendingAp = options.pendingReviewApCount ?? 0
  if (pendingProposals > 0) {
    urgentDecisions.push(`${pendingProposals} usulan proposal menunggu persetujuan Anda.`)
  }
  if (pendingAp > 0) {
    urgentDecisions.push(`${pendingAp} bukti rencana aksi menunggu peninjauan Anda.`)
  }
  if (urgentDecisions.length === 0) {
    urgentDecisions.push('Tidak ada persetujuan yang tertunda saat ini.')
  }

  const totalDecisions = pendingProposals + pendingAp
  let headline = `Kondisi Portofolio: ${healthScore}% `
  if (healthScore >= 80) {
    headline += `(Optimal) — ${healthSummary.onTrack} proyek berjalan sesuai target. `
  } else if (healthScore >= 50) {
    headline += `(Perlu Perhatian) — ${healthSummary.atRisk + healthSummary.delayed} proyek membutuhkan penyesuaian jadwal. `
  } else {
    headline += `(Kritis) — ${healthSummary.delayed} proyek mengalami keterlambatan. `
  }
  if (totalDecisions > 0) {
    headline += `Ada ${totalDecisions} item persetujuan yang membutuhkan tindakan Anda.`
  } else {
    headline += 'Seluruh alur kerja berjalan lancar tanpa antrean persetujuan.'
  }

  const executiveDigest: ExecutiveDigest = {
    headline,
    healthScore,
    keyBlockers,
    keyMilestones,
    urgentDecisions,
  }

  return {
    healthSummary,
    predictabilityScore,
    bottleneckSummary,
    executiveDigest,
    timelineHorizon: {
      minDate: new Date(minTime).toISOString(),
      maxDate: new Date(maxTime).toISOString(),
      todayPositionPercent,
    },
    temporalMilestones,
    projectHealth,
    divisionProgress,
    upcomingMilestones,
  }
}
