import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { logActivity } from '@/lib/activity-log'

// PIC menyelesaikan Action Plan pribadi sendiri tanpa review atasan.
// Hanya berlaku untuk isPersonal: true (atau taskId: null).
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const existing = await prisma.actionPlan.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Action Plan tidak ditemukan' }, { status: 404 })
    }

    if (existing.picId !== user.id) {
      return NextResponse.json({ error: 'Hanya PIC pemilik yang dapat menyelesaikan AP ini' }, { status: 403 })
    }

    if (!existing.isPersonal && existing.taskId) {
      return NextResponse.json(
        { error: 'Action Plan inisiatif proyek wajib melalui alur review atasan' },
        { status: 400 }
      )
    }

    if (existing.status === 'COMPLETE') {
      return NextResponse.json({ error: 'Action Plan sudah berstatus Selesai' }, { status: 400 })
    }

    const result = await prisma.actionPlan.updateMany({
      where: {
        id,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'EVIDENCE_REQUIRED', 'REJECTED', 'OVERDUE'] },
      },
      data: { status: 'COMPLETE' },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: 'Status Action Plan sudah berubah, refresh halaman' }, { status: 409 })
    }

    await logActivity({
      userId: user.id,
      actionPlanId: id,
      action: 'STATUS_CHANGED',
      oldValue: existing.status,
      newValue: 'COMPLETE',
    })

    return NextResponse.json({ success: true, status: 'COMPLETE' })
  } catch (error) {
    console.error('[ACTION_PLAN_COMPLETE_PERSONAL]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
