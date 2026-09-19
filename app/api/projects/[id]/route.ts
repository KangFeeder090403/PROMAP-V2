import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canManageProject } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
      },
    })

    if (!project || project.deletedAt) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // RBAC & Tenant Isolation
    if (user.role === 'SUPER_ADMIN') {
      // Lolos
    } else if (user.role === 'ADMIN_OPERATIONAL') {
      if (project.companyId !== user.companyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (user.role === 'MANAGER') {
      if (project.companyId !== user.companyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const isOwnerOrGeneral =
        project.divisionId === null ||
        (user.divisionId !== null && project.divisionId === user.divisionId)
      if (!isOwnerOrGeneral) {
        if (!user.divisionId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const hasDivisionTask = await prisma.task.findFirst({
          where: { projectId: id, divisionId: user.divisionId, deletedAt: null },
          select: { id: true },
        })
        if (!hasDivisionTask) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    } else if (user.role === 'PIC') {
      if (project.companyId !== user.companyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const isSameDivision = project.divisionId === null || project.divisionId === user.divisionId
      if (!isSameDivision) {
        const hasTask = await prisma.task.findFirst({
          where: { projectId: id, picId: user.id, deletedAt: null },
          select: { id: true },
        })
        if (!hasTask) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ambil detail creator manual karena Prisma schema Project tidak punya relation ke User
    let createdBy: { id: string; name: string } | null = null
    if (project.createdById) {
      const creator = await prisma.user.findUnique({
        where: { id: project.createdById },
        select: { id: true, name: true },
      })
      if (creator) createdBy = creator
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: id, deletedAt: null },
      include: {
        pic: {
          select: {
            id: true,
            name: true,
            division: { select: { name: true } },
          },
        },
        actionPlans: {
          where: { deletedAt: null },
          include: {
            pic: { select: { id: true, name: true } },
            checklists: { select: { isDone: true } },
          },
          orderBy: { endDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETE' || t.status === 'APPROVED').length
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length
    const overdueTasks = tasks.filter((t) => {
      if (t.status === 'OVERDUE') return true
      if (t.status !== 'COMPLETE' && t.status !== 'APPROVED' && t.endDate && new Date(t.endDate) < now) {
        return true
      }
      return false
    }).length

    const taskIds = tasks.map((t) => t.id)
    // taskIds kosong -> cabang `in: []` tidak cocok apa pun, cabang projectId tetap jalan
    // sehingga log pembuatan project (mis. hasil konversi Proposal) tetap tampil.
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { projectId: id },
          { actionPlan: { taskId: { in: taskIds }, deletedAt: null } },
        ],
      },
      include: {
        user: { select: { id: true, name: true } },
        actionPlan: { select: { id: true, title: true } },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      project: {
        ...project,
        createdBy,
      },
      metrics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
      },
      tasks,
      activityLogs,
    })
  } catch (error) {
    console.error('[PROJECT_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canManageProject(user, existing.divisionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && existing.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // MANAGER tidak bisa ubah divisionId — field diabaikan
    if ((user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL') && body.divisionId !== undefined) {
      if (body.divisionId === null || body.divisionId === '') {
        updateData.divisionId = null
      } else {
        const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
        if (!division || division.deletedAt || division.companyId !== existing.companyId) {
          return NextResponse.json({ error: 'Invalid divisionId' }, { status: 400 })
        }
        updateData.divisionId = body.divisionId
      }
    }

    // Kelola PIC project (tambah / kurangi PIC via Task)
    if (Array.isArray(body.picIds)) {
      const targetPicIds: string[] = Array.from(
        new Set<string>(body.picIds.filter((x: unknown): x is string => typeof x === 'string'))
      )

      const currentTasks = await prisma.task.findMany({
        where: { projectId: id, deletedAt: null },
        include: {
          pic: { select: { id: true, name: true, divisionId: true } },
          actionPlans: { where: { deletedAt: null }, select: { id: true } },
        },
      })

      const currentPicIdSet = new Set<string>(currentTasks.map((t) => t.picId))
      const targetPicIdSet = new Set<string>(targetPicIds)

      // Cek PIC yang mau dihapus: tolak jika task sudah memiliki Action Plan
      const tasksToRemove = currentTasks.filter((t) => !targetPicIdSet.has(t.picId))
      for (const t of tasksToRemove) {
        if (t.actionPlans.length > 0) {
          return NextResponse.json(
            {
              error: `PIC ${t.pic.name} tidak dapat dihapus karena sudah memiliki ${t.actionPlans.length} Action Plan aktif. Selesaikan atau pindahkan Action Plan terlebih dahulu.`,
            },
            { status: 400 }
          )
        }
      }

      // Validasi PIC yang baru ditambahkan
      const picIdsToAdd: string[] = targetPicIds.filter((pId) => !currentPicIdSet.has(pId))
      let picsToAdd: { id: string; name: string; divisionId: string | null }[] = []
      if (picIdsToAdd.length > 0) {
        picsToAdd = await prisma.user.findMany({
          where: {
            id: { in: picIdsToAdd },
            companyId: existing.companyId,
            deletedAt: null,
            status: 'ACTIVE',
          },
          select: { id: true, name: true, divisionId: true },
        })

        if (picsToAdd.length !== picIdsToAdd.length || picsToAdd.some((p) => !p.divisionId)) {
          return NextResponse.json(
            { error: 'PIC baru tidak valid atau belum memiliki divisi' },
            { status: 400 }
          )
        }

        if (user.role === 'MANAGER' && picsToAdd.some((p) => p.divisionId !== user.divisionId)) {
          return NextResponse.json(
            { error: 'Manager hanya bisa menugaskan PIC di divisinya sendiri' },
            { status: 403 }
          )
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        const updatedProject = await tx.project.update({
          where: { id },
          data: updateData,
        })

        if (tasksToRemove.length > 0) {
          await tx.task.updateMany({
            where: {
              id: { in: tasksToRemove.map((t) => t.id) },
            },
            data: { deletedAt: new Date() },
          })
        }

        if (picsToAdd.length > 0) {
          await tx.task.createMany({
            data: picsToAdd.map((p) => ({
              title: `Kontribusi ${p.name}`,
              description: `Task awal untuk ${p.name}. Ganti judul dan tambahkan Action Plan sesuai lingkup kerjanya.`,
              projectId: id,
              divisionId: p.divisionId!,
              picId: p.id,
              createdById: user.id,
              startDate: updateData.startDate ?? existing.startDate,
              endDate: updateData.endDate ?? existing.endDate,
            })),
          })
        }

        return updatedProject
      })

      if (picsToAdd.length > 0) {
        await notify({
          userIds: picsToAdd.map((p) => p.id),
          title: 'Ditugaskan ke Project',
          message: `Kamu telah ditugaskan ke project "${existing.name}" sebagai PIC.`,
          link: `/projects/${id}`,
          companyId: existing.companyId,
        })
      }

      if (tasksToRemove.length > 0) {
        await notify({
          userIds: tasksToRemove.map((t) => t.picId),
          title: 'Penugasan Project Berakhir',
          message: `Penugasan kamu pada project "${existing.name}" telah dihentikan.`,
          link: `/projects`,
          companyId: existing.companyId,
        })
      }

      return NextResponse.json(result)
    }

    const result = await prisma.project.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PROJECT_PUT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canManageProject(user, existing.divisionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && existing.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const activeTaskCount = await prisma.task.count({ where: { projectId: id, deletedAt: null } })
    if (activeTaskCount > 0) {
      return NextResponse.json({ error: 'Project masih punya Task aktif' }, { status: 409 })
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({ success: true, message: 'Project softly deleted' })
  } catch (error) {
    console.error('[PROJECT_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
