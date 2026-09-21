import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { logActivity } from '@/lib/activity-log'

// PIC mulai kerja sendiri. NOT_STARTED/REJECTED/OVERDUE -> IN_PROGRESS.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const existing = await prisma.actionPlan.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Action Plan not found' }, { status: 404 })
    }

    if (existing.picId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await prisma.actionPlan.updateMany({
      where: { id, status: { in: ['NOT_STARTED', 'REJECTED', 'OVERDUE'] } },
      data: { status: 'IN_PROGRESS' },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Action Plan sudah berubah status, refresh dulu' }, { status: 409 })
    }

    await logActivity({
      userId: user.id,
      actionPlanId: id,
      action: 'STATUS_CHANGED',
      oldValue: existing.status,
      newValue: 'IN_PROGRESS',
    })

    return NextResponse.json({ success: true, status: 'IN_PROGRESS' })
  } catch (error) {
    console.error('[ACTION_PLAN_START]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
