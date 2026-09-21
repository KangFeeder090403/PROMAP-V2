import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'

// PIC submit AP untuk direview. IN_PROGRESS/EVIDENCE_REQUIRED -> PENDING_APPROVAL.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    if (!body.evaluationNote?.trim()) {
      return NextResponse.json({ error: 'evaluationNote wajib diisi' }, { status: 400 })
    }

    const { id } = params
    const ap = await prisma.actionPlan.findUnique({ where: { id } })
    if (!ap || ap.deletedAt) {
      return NextResponse.json({ error: 'Action Plan not found' }, { status: 404 })
    }
    if (ap.picId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data: Record<string, unknown> = {
      status: 'PENDING_APPROVAL',
      evaluationNote: body.evaluationNote,
    }
    if ('evidenceLink' in body) data.evidenceLink = body.evidenceLink

    const result = await prisma.actionPlan.updateMany({
      where: { id, status: { in: ['IN_PROGRESS', 'EVIDENCE_REQUIRED'] } },
      data,
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'Action Plan sudah berubah status, refresh dulu' }, { status: 409 })
    }

    await logActivity({
      userId: user.id,
      actionPlanId: id,
      action: 'STATUS_CHANGED',
      oldValue: ap.status,
      newValue: 'PENDING_APPROVAL',
    })

    if (ap.divisionId) {
      const managers = await prisma.user.findMany({
        where: { role: 'MANAGER', divisionId: ap.divisionId, deletedAt: null },
        select: { id: true },
      })
      await notify({
        userIds: managers.map((m) => m.id),
        title: 'AP menunggu review',
        message: `"${ap.title}" diajukan oleh ${user.name} dan menunggu persetujuan Anda`,
        link: `/action-plans?open=${id}`,
        companyId: ap.companyId,
      })
    } else {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN_OPERATIONAL', companyId: ap.companyId, deletedAt: null },
        select: { id: true },
      })
      await notify({
        userIds: admins.map((a) => a.id),
        title: 'AP personal menunggu review',
        message: `"${ap.title}" diajukan oleh ${user.name} dan menunggu persetujuan Anda`,
        link: `/action-plans?open=${id}`,
        companyId: ap.companyId,
      })
    }

    return NextResponse.json({ success: true, status: 'PENDING_APPROVAL' })
  } catch (error) {
    console.error('[ACTION_PLAN_SUBMIT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
