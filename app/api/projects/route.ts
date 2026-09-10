import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, projectScope, canManageProject } from '@/lib/rbac'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { ...projectScope(user), deletedAt: null },
      orderBy: { createdAt: 'desc' }
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

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    let companyId: string
    let divisionId: string | null = null

    if (user.role === 'SUPER_ADMIN') {
      if (!body.companyId) {
        return NextResponse.json({ error: 'companyId is required for SUPER_ADMIN' }, { status: 400 })
      }
      const company = await prisma.company.findUnique({ where: { id: body.companyId } })
      if (!company || company.deletedAt) {
        return NextResponse.json({ error: 'Invalid companyId' }, { status: 400 })
      }
      companyId = body.companyId

      if (body.divisionId) {
        const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
        if (!division || division.deletedAt || division.companyId !== companyId) {
          return NextResponse.json({ error: 'Invalid divisionId' }, { status: 400 })
        }
        divisionId = body.divisionId
      }
    } else if (user.role === 'ADMIN_OPERATIONAL') {
      companyId = user.companyId!

      if (body.divisionId) {
        const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
        if (!division || division.deletedAt || division.companyId !== companyId) {
          return NextResponse.json({ error: 'Invalid divisionId' }, { status: 400 })
        }
        divisionId = body.divisionId
      }
    } else {
      // MANAGER
      companyId = user.companyId!
      divisionId = user.divisionId
    }

    // PIC yang ditugaskan — divalidasi harus se-company & punya divisi, karena
    // Task.divisionId wajib. Divisi task diambil dari divisi PIC-nya sendiri
    // sehingga satu project bisa tampil lintas divisi tanpa ubah schema.
    const picIds: string[] = Array.isArray(body.picIds)
      ? [...new Set(body.picIds.filter((id: unknown) => typeof id === 'string'))] as string[]
      : []

    const pics = picIds.length
      ? await prisma.user.findMany({
          where: { id: { in: picIds }, companyId, deletedAt: null, status: 'ACTIVE' },
          select: { id: true, name: true, divisionId: true },
        })
      : []

    if (pics.length !== picIds.length || pics.some((p) => !p.divisionId)) {
      return NextResponse.json(
        { error: 'PIC tidak valid atau belum punya divisi' },
        { status: 400 }
      )
    }

    // MANAGER hanya boleh menugaskan PIC di divisinya sendiri.
    if (user.role === 'MANAGER' && pics.some((p) => p.divisionId !== user.divisionId)) {
      return NextResponse.json(
        { error: 'Manager hanya bisa menugaskan PIC di divisinya sendiri' },
        { status: 403 }
      )
    }

    const startDate = body.startDate ? new Date(body.startDate) : null
    const endDate = body.endDate ? new Date(body.endDate) : null

    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: body.name,
          description: body.description,
          companyId,
          divisionId,
          startDate,
          endDate,
          createdById: user.id
        }
      })

      if (pics.length) {
        await tx.task.createMany({
          data: pics.map((p) => ({
            title: `Kontribusi ${p.name}`,
            description: `Task awal untuk ${p.name}. Ganti judul dan tambahkan Action Plan sesuai lingkup kerjanya.`,
            projectId: project.id,
            divisionId: p.divisionId!,
            picId: p.id,
            createdById: user.id,
            startDate,
            endDate,
          })),
        })
      }

      return project
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[PROJECTS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
