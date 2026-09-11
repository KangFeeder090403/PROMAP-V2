import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma, ActionPlanStatus, Priority } from '@/lib/generated/prisma/client'
import { getSessionUser, apScope, canCreateAP } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { shortRef } from '@/lib/dashboard-aggregate'

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
    const search = searchParams.get('search')?.trim()
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? '10') || 10))

    // Buku besar (scope penuh, tanpa filter baris) — dipakai untuk chips.
    const baseWhere: Prisma.ActionPlanWhereInput = { ...apScope(user), deletedAt: null }

    const where: Prisma.ActionPlanWhereInput = { ...baseWhere }
    if (status) where.status = status as ActionPlanStatus
    if (priority) where.priority = priority as Priority
    if (taskId) where.taskId = taskId
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Chips workflow state: hitung per status dari seluruh AP in-scope.
    const statusGroups = await prisma.actionPlan.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    })
    const counts = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]))

    const [total, items] = await Promise.all([
      prisma.actionPlan.count({ where }),
      prisma.actionPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          pic: { select: { id: true, name: true, role: true } },
          task: {
            select: {
              id: true,
              title: true,
              project: { select: { id: true, name: true } },
            },
          },
          division: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
      }),
    ])

    // Progress checklist per AP — satu query agregasi, bukan N+1.
    const agg = await prisma.checklist.groupBy({
      by: ['actionPlanId', 'isDone'],
      where: { actionPlanId: { in: items.map((a) => a.id) } },
      _count: { _all: true },
    })
    const checklistStats: Record<string, { done: number; total: number }> = {}
    for (const row of agg) {
      const stat = (checklistStats[row.actionPlanId] ??= { done: 0, total: 0 })
      stat.total += row._count._all
      if (row.isDone) stat.done += row._count._all
    }

    const withMeta = items.map((a) => ({
      ...a,
      // shortRef: derivasi dari id, jadi stabil tanpa query urutan seluruh ledger
      // dan tidak bergeser saat ada AP lama di-soft-delete. Sama dengan dashboard.
      code: shortRef(a.id, 'AP'),
      commentCount: a._count.comments,
      checklistDone: checklistStats[a.id]?.done ?? 0,
      checklistTotal: checklistStats[a.id]?.total ?? 0,
    }))

    return NextResponse.json({ items: withMeta, counts, total, page, pageSize })
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
        message: `Ditugaskan oleh ${user.name}: "${result.title}"`,
        link: `/action-plans?open=${result.id}`,
        companyId
      })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[ACTION_PLANS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
