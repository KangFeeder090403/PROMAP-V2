import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canAssignTask } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

    const body = await req.json()

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
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
