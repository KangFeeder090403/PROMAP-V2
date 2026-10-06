import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope } from '@/lib/rbac'

export type ContributorProjectRow = {
  projectId: string
  projectName: string
  taskId: string | null
  taskTitle: string | null
  total: number
  complete: number
  inProgress: number
  overdue: number
  completionRate: number
}

export type ContributorAnalysisResponse = {
  picId: string
  picName: string
  totalAP: number
  completedAP: number
  overallRate: number
  projects: ContributorProjectRow[]
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = apScope(user)

    const now = new Date()

    const aps = await prisma.actionPlan.findMany({
      where: {
        ...scope,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        endDate: true,
        picId: true,
        pic: { select: { id: true, name: true } },
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
    })

    // Group by contributor → project
    type PicKey = string
    type ProjectKey = string

    const byPic: Map<PicKey, {
      picId: string
      picName: string
      projects: Map<ProjectKey, ContributorProjectRow>
    }> = new Map()

    for (const ap of aps) {
      const picId = ap.pic.id
      const picName = ap.pic.name
      const projectId = ap.task?.project?.id ?? '__personal__'
      const projectName = ap.task?.project?.name ?? 'Personal'
      const taskId = ap.task?.id ?? null
      const taskTitle = ap.task?.title ?? null

      if (!byPic.has(picId)) {
        byPic.set(picId, { picId, picName, projects: new Map() })
      }
      const picEntry = byPic.get(picId)!

      if (!picEntry.projects.has(projectId)) {
        picEntry.projects.set(projectId, {
          projectId,
          projectName,
          taskId,
          taskTitle,
          total: 0,
          complete: 0,
          inProgress: 0,
          overdue: 0,
          completionRate: 0,
        })
      }
      const proj = picEntry.projects.get(projectId)!
      proj.total++

      const isComplete = ap.status === 'COMPLETE' || ap.status === 'APPROVED'
      const isActive = ap.status === 'IN_PROGRESS' || ap.status === 'NOT_STARTED'
      const isOverdue =
        !isComplete && ap.endDate < now && (isActive || ap.status === 'EVIDENCE_REQUIRED')

      if (isComplete) proj.complete++
      else if (isOverdue) proj.overdue++
      else if (ap.status === 'IN_PROGRESS') proj.inProgress++
    }

    // Build response per contributor (one row per logged-in user if PIC, or all if manager+)
    const result: ContributorAnalysisResponse[] = []
    for (const [, entry] of byPic) {
      const projects: ContributorProjectRow[] = []
      let totalAP = 0
      let completedAP = 0

      for (const [, proj] of entry.projects) {
        proj.completionRate = proj.total > 0 ? Math.round((proj.complete / proj.total) * 100) : 0
        projects.push(proj)
        totalAP += proj.total
        completedAP += proj.complete
      }

      projects.sort((a, b) => b.total - a.total)

      result.push({
        picId: entry.picId,
        picName: entry.picName,
        totalAP,
        completedAP,
        overallRate: totalAP > 0 ? Math.round((completedAP / totalAP) * 100) : 0,
        projects,
      })
    }

    result.sort((a, b) => b.totalAP - a.totalAP)

    return NextResponse.json({ contributors: result }, { status: 200 })
  } catch (error) {
    console.error('[CONTRIBUTOR_ANALYSIS_GET]', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
