import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope, canCreateAP } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const taskId = searchParams.get('taskId')

    const where: any = { ...apScope(user), deletedAt: null }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (taskId) where.taskId = taskId

    const data = await prisma.actionPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[ACTION_PLANS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canCreateAP(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.title || !body.outcomeKpi || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'title, outcomeKpi, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    const isPersonal = body.taskId == null

    let task: Awaited<ReturnType<typeof prisma.task.findFirst<{ include: { division: true } }>>> = null
    if (!isPersonal) {
      task = await prisma.task.findUnique({
        where: { id: body.taskId },
        include: { division: true }
      })
      if (!task || task.deletedAt) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
    }

    const targetId = isPersonal ? body.picId ?? user.id : task!.picId
    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target || target.deletedAt) {
      return NextResponse.json({ error: 'Target user tidak ditemukan' }, { status: 404 })
    }

    // Guard scope target — wajib sebelum create
    if (user.role === 'PIC' && targetId !== user.id) {
      return NextResponse.json({ error: 'PIC hanya boleh membuat AP untuk diri sendiri' }, { status: 403 })
    }
    if (user.role === 'MANAGER') {
      if (isPersonal && targetId !== user.id && target.divisionId !== user.divisionId) {
        return NextResponse.json(
          { error: 'Manager hanya boleh assign PIC di divisinya sendiri' },
          { status: 403 }
        )
      }
      if (!isPersonal && task!.divisionId !== user.divisionId) {
        return NextResponse.json(
          { error: 'Manager hanya boleh buat AP untuk task di divisinya sendiri' },
          { status: 403 }
        )
      }
    }
    if (user.role === 'ADMIN_OPERATIONAL' && target.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Target user beda company' }, { status: 403 })
    }

    let companyId: string
    let divisionId: string | null

    if (isPersonal) {
      if (!target.companyId) {
        return NextResponse.json(
          { error: 'Target user tanpa companyId tidak bisa punya Personal AP' },
          { status: 400 }
        )
      }
      companyId = target.companyId
      if (target.role === 'SUPER_ADMIN' || target.role === 'ADMIN_OPERATIONAL') {
        divisionId = null
      } else {
        if (!target.divisionId) {
          return NextResponse.json({ error: 'Target user tidak punya divisionId' }, { status: 400 })
        }
        divisionId = target.divisionId
      }
    } else {
      companyId = task!.division.companyId
      divisionId = task!.divisionId
    }

    const result = await prisma.actionPlan.create({
      data: {
        title: body.title,
        outcomeKpi: body.outcomeKpi,
        priority: body.priority ?? 'MEDIUM',
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        taskId: isPersonal ? null : task!.id,
        picId: target.id,
        companyId,
        divisionId,
        isPersonal,
        status: 'NOT_STARTED'
      }
    })

    if (target.id !== user.id) {
      await notify({
        userIds: [target.id],
        title: 'Action Plan baru',
        message: `Kamu mendapat Action Plan baru: ${result.title}`,
        link: `/action-plans/${result.id}`,
        companyId
      })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[ACTION_PLANS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
