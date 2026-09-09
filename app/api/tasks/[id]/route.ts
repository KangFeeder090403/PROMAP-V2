import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canAssignTask, canUpdateTaskStatus } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

const PIC_ALLOWED_STATUS = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] as const

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Baca existing task dulu — dipakai kedua jalur (PIC & Admin/Manager) di bawah.
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { division: true }
    })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = await req.json()
    const bodyKeys = Object.keys(body)
    const isStatusOnly = bodyKeys.length === 1 && bodyKeys[0] === 'status'

    if (isStatusOnly && !canAssignTask(user)) {
      // Jalur PIC — drag Kanban, hanya boleh ubah status task miliknya sendiri.
      if (!canUpdateTaskStatus(user, existing) || existing.picId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!PIC_ALLOWED_STATUS.includes(body.status)) {
        return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
      }

      const result = await prisma.task.update({
        where: { id },
        data: { status: body.status }
      })
      return NextResponse.json(result)
    }

    if (!isStatusOnly && bodyKeys.includes('status') && !canAssignTask(user)) {
      // PIC kirim body campur (status + field lain) — tolak, jangan silent-strip.
      return NextResponse.json({ error: 'PIC hanya boleh update status' }, { status: 400 })
    }

    // Jalur existing (Admin/Manager, atau PIC tanpa key status) — guard role lama.
    if (!canAssignTask(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (user.role === 'ADMIN_OPERATIONAL' && existing.division.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'MANAGER' && existing.divisionId !== user.divisionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
    // Task cuma pakai 3 status ini (bukan 8 enum ActionPlanStatus) — whitelist sama seperti jalur PIC.
    if (body.status !== undefined) {
      if (!PIC_ALLOWED_STATUS.includes(body.status)) {
        return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
      }
      updateData.status = body.status
    }
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null

    let reassigned = false
    if (body.picId !== undefined && body.picId !== existing.picId) {
      const pic = await prisma.user.findUnique({ where: { id: body.picId } })
      if (!pic || pic.deletedAt) {
        return NextResponse.json({ error: 'PIC not found' }, { status: 404 })
      }
      if (pic.divisionId !== existing.divisionId) {
        return NextResponse.json({ error: 'PIC harus satu divisi dengan Task' }, { status: 403 })
      }
      updateData.picId = body.picId
      reassigned = true
    }

    const result = await prisma.task.update({
      where: { id },
      data: updateData
    })

    if (reassigned) {
      await notify({
        userIds: [result.picId],
        title: 'Task di-reassign',
        message: `Kamu ditugaskan ke task: ${result.title}`,
        link: `/tasks/${id}`,
        companyId: existing.division.companyId
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[TASK_PUT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canAssignTask(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params

    const existing = await prisma.task.findUnique({
      where: { id },
      include: { division: true }
    })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (user.role === 'ADMIN_OPERATIONAL' && existing.division.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'MANAGER' && existing.divisionId !== user.divisionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({ success: true, message: 'Task softly deleted' })
  } catch (error) {
    console.error('[TASK_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
