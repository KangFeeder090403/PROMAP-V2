import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, taskScope, projectScope, canAssignTask } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    let where: any = { deletedAt: null }

    if (projectId) {
      // Pastikan user berhak melihat project ini
      const project = await prisma.project.findFirst({
        where: { id: projectId, ...projectScope(user), deletedAt: null },
        select: { id: true, companyId: true },
      })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      where.projectId = projectId
      // Tenant isolation guard: hanya task di company user
      if (user.role !== 'SUPER_ADMIN') {
        where.division = { companyId: user.companyId! }
      }
    } else {
      where = { ...where, ...taskScope(user) }
    }

    const data = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[TASKS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canAssignTask(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.title || !body.projectId || !body.picId) {
      return NextResponse.json({ error: 'title, projectId, and picId are required' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id: body.projectId } })
    if (!project || project.deletedAt) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let divisionId: string

    if (user.role === 'MANAGER') {
      divisionId = user.divisionId!
      if (project.divisionId !== null && project.divisionId !== user.divisionId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // ADMIN_OPERATIONAL / SUPER_ADMIN
      if (!body.divisionId) {
        return NextResponse.json({ error: 'divisionId is required' }, { status: 400 })
      }
      const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
      if (!division || division.deletedAt || division.companyId !== project.companyId) {
        return NextResponse.json({ error: 'Invalid divisionId' }, { status: 400 })
      }
      divisionId = body.divisionId
    }

    const pic = await prisma.user.findUnique({ where: { id: body.picId } })
    if (!pic || pic.deletedAt) {
      return NextResponse.json({ error: 'PIC not found' }, { status: 404 })
    }
    if (pic.divisionId !== divisionId) {
      return NextResponse.json({ error: 'PIC harus satu divisi dengan Task' }, { status: 403 })
    }

    const result = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        projectId: body.projectId,
        divisionId,
        picId: body.picId,
        priority: body.priority,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        createdById: user.id
      }
    })

    await notify({
      userIds: [body.picId],
      title: 'Task baru',
      message: `Kamu mendapat task baru: ${result.title}`,
      link: `/projects/${result.projectId}`,
      companyId: project.companyId
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[TASKS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
