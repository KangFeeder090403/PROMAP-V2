import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, projectScope, canManageProject } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { createProjectWithTasks, ProjectInputError } from '@/lib/projects'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const allowedSortFields = ['createdAt', 'name', 'startDate', 'endDate']
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'

    const projects = await prisma.project.findMany({
      where: { ...projectScope(user), deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: { [safeSortBy]: sortOrder },
    })

    const ids = projects.map((p) => p.id)

    // Hanya butuh field ringan untuk agregasi; perhitungan dilakukan di JS
    // agar tidak N+1 dan tetap mendukung filter klien tanpa re-fetch.
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

    // Divisi yang perlu di-resolve = divisi project + semua divisi task di dalamnya
    // (task dibuat mengikuti divisi PIC-nya, jadi ini yang bikin project lintas divisi).
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

    const data = projects.map((p) => {
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
        ...p,
        division: p.divisionId ? (divisionMap.get(p.divisionId) ?? null) : null,
        divisions: [...divisionSet.values()],
        taskCount: ts.length,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        actionPlanCount: apCountByProject.get(p.id) ?? 0,
      }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[PROJECTS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // MANAGER selalu create di divisinya sendiri — pass user.divisionId sbg existingDivisionId
    if (!canManageProject(user, user.divisionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    const { project, pics } = await prisma.$transaction((tx) =>
      createProjectWithTasks(tx, user, {
        name: body.name,
        description: body.description ?? null,
        companyId: body.companyId ?? null,
        divisionId: body.divisionId ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        picIds: body.picIds,
      })
    )

    if (pics.length > 0) {
      await notify({
        userIds: pics.map((p) => p.id),
        title: 'Ditugaskan ke Project Baru',
        message: `Kamu telah ditugaskan ke project "${project.name}" sebagai PIC.`,
        link: `/projects/${project.id}`,
        companyId: project.companyId,
      })
    }

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof ProjectInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PROJECTS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
