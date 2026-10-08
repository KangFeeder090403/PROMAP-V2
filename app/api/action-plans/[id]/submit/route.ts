import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import { isHttpUrl } from '@/lib/utils'

// PIC submit AP untuk direview. IN_PROGRESS/EVIDENCE_REQUIRED -> PENDING_APPROVAL.
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    if (!body.evaluationNote?.trim()) {
      return NextResponse.json({ error: 'evaluationNote wajib diisi' }, { status: 400 })
    }
    if (body.evidenceLink != null && body.evidenceLink !== '' && !isHttpUrl(body.evidenceLink)) {
      return NextResponse.json({ error: 'Link bukti harus diawali http:// atau https://' }, { status: 400 })
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
    if ('evidenceLink' in body) data.evidenceLink = body.evidenceLink ? body.evidenceLink.trim() : null

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

    // Notify reviewer: MANAGER divisi (jika ada) + ADMIN_OP company + SUPER_ADMIN
    // Semua difilter status ACTIVE agar lintas-tenant aman. SUPER_ADMIN selalu dapat notif
    // karena canReviewActionPlan(SUPER_ADMIN) = true untuk semua AP.
    const reviewerIds = new Set<string>()

    if (ap.divisionId) {
      const managers = await prisma.user.findMany({
        where: { role: 'MANAGER', divisionId: ap.divisionId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      })
      managers.forEach((m) => reviewerIds.add(m.id))
    } else {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN_OPERATIONAL', companyId: ap.companyId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      })
      admins.forEach((a) => reviewerIds.add(a.id))
    }

    // SUPER_ADMIN selalu di-notify (global reviewer — personal & division)
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    })
    superAdmins.forEach((s) => reviewerIds.add(s.id))
    reviewerIds.delete(user.id)

    if (reviewerIds.size > 0) {
      await notify({
        userIds: [...reviewerIds],
        title: ap.divisionId ? 'AP menunggu review' : 'AP personal menunggu review',
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
