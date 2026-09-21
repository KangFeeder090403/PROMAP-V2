import { getSessionUser, apScope, canReviewActionPlan } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'

const ACTION_TO_STATUS = {
  COMPLETE: 'COMPLETE',
  REJECTED: 'REJECTED',
  EVIDENCE_REQUIRED: 'EVIDENCE_REQUIRED',
} as const

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const action = body.action as keyof typeof ACTION_TO_STATUS
    if (!(action in ACTION_TO_STATUS)) {
      return NextResponse.json(
        { error: 'action must be COMPLETE, REJECTED, or EVIDENCE_REQUIRED' },
        { status: 400 }
      )
    }
    if ((action === 'REJECTED' || action === 'EVIDENCE_REQUIRED') && !body.reviewNote?.trim()) {
      return NextResponse.json({ error: 'reviewNote wajib diisi' }, { status: 400 })
    }

    // Defense-in-depth: filter scope dulu di query (404), baru guard eksplisit (403)
    const ap = await prisma.actionPlan.findFirst({
      where: { id: params.id, deletedAt: null, ...apScope(user) },
      select: { id: true, picId: true, divisionId: true, companyId: true, status: true, title: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!canReviewActionPlan(user, ap)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newStatus = ACTION_TO_STATUS[action]
    const data: Record<string, unknown> = { status: newStatus }
    if ('reviewNote' in body) data.reviewNote = body.reviewNote

    const result = await prisma.actionPlan.updateMany({
      where: { id: params.id, status: 'PENDING_APPROVAL' },
      data,
    })
    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Action Plan sudah direview atau belum di-submit' },
        { status: 409 }
      )
    }

    await logActivity({
      userId: user.id,
      actionPlanId: params.id,
      action: 'STATUS_CHANGED',
      oldValue: ap.status,
      newValue: newStatus,
    })

    const titleMap = {
      COMPLETE: 'AP disetujui',
      REJECTED: 'AP ditolak',
      EVIDENCE_REQUIRED: 'AP butuh bukti tambahan',
    }
    const notePreview = body.reviewNote?.trim() ? ` Catatan: "${body.reviewNote.trim()}"` : ''
    await notify({
      userIds: [ap.picId],
      title: titleMap[action],
      message: `"${ap.title}" — ${titleMap[action]}.${notePreview}`,
      link: `/action-plans?open=${params.id}`,
      companyId: ap.companyId,
    })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('[ACTION_PLAN_REVIEW]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
