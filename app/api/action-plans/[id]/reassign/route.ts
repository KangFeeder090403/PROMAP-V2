import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canReassignAP } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

const REASSIGNABLE = ['NOT_STARTED', 'IN_PROGRESS', 'REJECTED']

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canReassignAP(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params
    const existing = await prisma.actionPlan.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Action Plan not found' }, { status: 404 })
    }

    if (!REASSIGNABLE.includes(existing.status)) {
      return NextResponse.json({ error: 'AP tidak bisa di-reassign pada status ini' }, { status: 409 })
    }
    if (existing.divisionId === null) {
      return NextResponse.json({ error: 'Personal AP tidak bisa di-reassign' }, { status: 409 })
    }

    if (user.role === 'ADMIN_OPERATIONAL' && existing.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'MANAGER' && existing.divisionId !== user.divisionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (!body.newPicId) {
      return NextResponse.json({ error: 'newPicId is required' }, { status: 400 })
    }

    const newPic = await prisma.user.findUnique({ where: { id: body.newPicId } })
    if (!newPic || newPic.deletedAt) {
      return NextResponse.json({ error: 'PIC baru tidak ditemukan' }, { status: 404 })
    }
    if (newPic.divisionId !== existing.divisionId) {
      return NextResponse.json({ error: 'PIC baru harus satu divisi dengan Action Plan' }, { status: 403 })
    }

    const result = await prisma.actionPlan.update({
      where: { id },
      data: { picId: newPic.id }
    })

    await notify({
      userIds: [newPic.id],
      title: 'Action Plan dialihkan kepada Anda',
      message: `Rencana aksi "${result.title}" dialihkan kepada Anda oleh ${user.name}.`,
      link: `/action-plans?open=${id}`,
      companyId: existing.companyId
    })

    if (existing.picId && existing.picId !== user.id && existing.picId !== newPic.id) {
      await notify({
        userIds: [existing.picId],
        title: 'Action Plan dialihkan',
        message: `Rencana aksi "${result.title}" telah dialihkan kepada ${newPic.name}.`,
        link: `/action-plans?open=${id}`,
        companyId: existing.companyId
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ACTION_PLAN_REASSIGN]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
