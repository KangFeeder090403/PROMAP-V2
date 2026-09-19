import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canCreateAP } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import type { Priority, ActionPlanStatus } from '@/lib/generated/prisma/client'

const CREATABLE_STATUS = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] as const
type CreatableStatus = (typeof CREATABLE_STATUS)[number]

interface BulkCreateItem {
  title: string
  outcomeKpi?: string
  priority?: Priority
  startDate?: string
  endDate?: string
  taskId?: string | null
  picId?: string | null
  status?: ActionPlanStatus
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
    const rawItems: BulkCreateItem[] = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body)
        ? body
        : []

    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'Daftar action plan tidak boleh kosong' }, { status: 400 })
    }

    if (rawItems.length > 50) {
      return NextResponse.json({ error: 'Maksimal 50 item per batch request' }, { status: 400 })
    }

    const now = new Date()
    const defaultStart = new Date(now)
    defaultStart.setHours(0, 0, 0, 0)
    const defaultEnd = new Date(defaultStart)
    defaultEnd.setDate(defaultEnd.getDate() + 7)

    // Pre-validate & pre-fetch tasks & target users
    const taskIds = Array.from(
      new Set(rawItems.map((it) => it.taskId).filter((id): id is string => Boolean(id)))
    )
    const picIds = Array.from(
      new Set(rawItems.map((it) => it.picId).filter((id): id is string => Boolean(id)))
    )

    // Always include user.id in users map
    picIds.push(user.id)

    const [existingTasks, existingUsers] = await Promise.all([
      taskIds.length > 0
        ? prisma.task.findMany({
            where: { id: { in: taskIds }, deletedAt: null },
            include: { division: true },
          })
        : [],
      prisma.user.findMany({
        where: { id: { in: picIds }, deletedAt: null, status: 'ACTIVE' },
      }),
    ])

    const taskMap = new Map(existingTasks.map((t) => [t.id, t]))
    const userMap = new Map(existingUsers.map((u) => [u.id, u]))

    // Validate each item
    type PreparedItem = {
      title: string
      outcomeKpi: string
      priority: Priority
      startDate: Date
      endDate: Date
      taskId: string | null
      picId: string
      companyId: string
      divisionId: string | null
      isPersonal: boolean
      targetUserName: string
      status: CreatableStatus
    }

    const preparedList: PreparedItem[] = []

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i]
      const title = item.title?.trim()
      if (!title) {
        return NextResponse.json(
          { error: `Item ke-${i + 1}: Judul wajib diisi` },
          { status: 400 }
        )
      }

      const outcomeKpi = item.outcomeKpi?.trim() || title
      const priority: Priority =
        item.priority === 'HIGH' || item.priority === 'LOW' ? item.priority : 'MEDIUM'

      const rawStatus = item.status || 'NOT_STARTED'
      if (!CREATABLE_STATUS.includes(rawStatus as CreatableStatus)) {
        return NextResponse.json(
          { error: `Item ke-${i + 1}: Status tidak valid` },
          { status: 400 }
        )
      }
      const status = rawStatus as CreatableStatus

      let startDate = item.startDate ? new Date(item.startDate) : defaultStart
      if (isNaN(startDate.getTime())) startDate = defaultStart

      let endDate = item.endDate ? new Date(item.endDate) : defaultEnd
      if (isNaN(endDate.getTime())) endDate = defaultEnd

      const isPersonal = !item.taskId

      if (status === 'COMPLETE' && !isPersonal) {
        return NextResponse.json(
          { error: `Item ke-${i + 1}: Action Plan terkait Task wajib melalui alur review atasan` },
          { status: 400 }
        )
      }

      let task = null

      if (!isPersonal) {
        task = taskMap.get(item.taskId!)
        if (!task) {
          return NextResponse.json(
            { error: `Item ke-${i + 1}: Task tidak ditemukan atau sudah dihapus` },
            { status: 404 }
          )
        }
      }

      const targetId = isPersonal ? (item.picId ?? user.id) : task!.picId
      const target = userMap.get(targetId)

      if (!target) {
        return NextResponse.json(
          { error: `Item ke-${i + 1}: PIC assignee tidak ditemukan atau tidak aktif` },
          { status: 404 }
        )
      }

      // Guard scope target
      if (user.role === 'PIC' && targetId !== user.id) {
        return NextResponse.json(
          { error: `Item ke-${i + 1}: PIC hanya boleh membuat AP untuk diri sendiri` },
          { status: 403 }
        )
      }

      if (user.role === 'MANAGER') {
        if (isPersonal && targetId !== user.id && target.divisionId !== user.divisionId) {
          return NextResponse.json(
            { error: `Item ke-${i + 1}: Manager hanya boleh assign PIC di divisinya sendiri` },
            { status: 403 }
          )
        }
        if (!isPersonal && task!.divisionId !== user.divisionId) {
          return NextResponse.json(
            { error: `Item ke-${i + 1}: Manager hanya boleh buat AP untuk task di divisinya sendiri` },
            { status: 403 }
          )
        }
      }

      if (user.role === 'ADMIN_OPERATIONAL' && target.companyId !== user.companyId) {
        return NextResponse.json(
          { error: `Item ke-${i + 1}: Target user beda company` },
          { status: 403 }
        )
      }

      let companyId: string
      let divisionId: string | null

      if (isPersonal) {
        if (!target.companyId) {
          return NextResponse.json(
            { error: `Item ke-${i + 1}: Target user tanpa companyId tidak bisa punya Personal AP` },
            { status: 400 }
          )
        }
        companyId = target.companyId
        if (target.role === 'SUPER_ADMIN' || target.role === 'ADMIN_OPERATIONAL') {
          divisionId = null
        } else {
          if (!target.divisionId) {
            return NextResponse.json(
              { error: `Item ke-${i + 1}: Target user tidak punya divisionId` },
              { status: 400 }
            )
          }
          divisionId = target.divisionId
        }
      } else {
        companyId = task!.division.companyId
        divisionId = task!.divisionId
      }

      preparedList.push({
        title,
        outcomeKpi,
        priority,
        startDate,
        endDate,
        taskId: isPersonal ? null : task!.id,
        picId: target.id,
        companyId,
        divisionId,
        isPersonal,
        targetUserName: target.name,
        status,
      })
    }

    // Execute in transaction
    const createdPlans = await prisma.$transaction(
      preparedList.map((item) =>
        prisma.actionPlan.create({
          data: {
            title: item.title,
            outcomeKpi: item.outcomeKpi,
            priority: item.priority,
            startDate: item.startDate,
            endDate: item.endDate,
            taskId: item.taskId,
            picId: item.picId,
            companyId: item.companyId,
            divisionId: item.divisionId,
            isPersonal: item.isPersonal,
            status: item.status,
          },
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
        })
      )
    )

    // Activity log untuk status selain NOT_STARTED (non-blocking)
    const itemsToLog = createdPlans.filter((ap) => ap.status !== 'NOT_STARTED')
    if (itemsToLog.length > 0) {
      await Promise.allSettled(
        itemsToLog.map((ap) =>
          logActivity({
            userId: user.id,
            actionPlanId: ap.id,
            action: 'STATUS_CHANGED',
            oldValue: null,
            newValue: ap.status,
          })
        )
      )
    }

    // Notify assignees (if not creator and not COMPLETE)
    const notificationsToTrigger = createdPlans.filter(
      (ap) => ap.picId !== user.id && ap.status !== 'COMPLETE'
    )
    if (notificationsToTrigger.length > 0) {
      await Promise.allSettled(
        notificationsToTrigger.map((ap) =>
          notify({
            userIds: [ap.picId],
            title: 'Action Plan baru',
            message: `Ditugaskan oleh ${user.name}: "${ap.title}"`,
            link: `/action-plans?open=${ap.id}`,
            companyId: ap.companyId,
          })
        )
      )
    }

    return NextResponse.json({ items: createdPlans, count: createdPlans.length }, { status: 201 })
  } catch (error) {
    console.error('[ACTION_PLANS_BULK_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
