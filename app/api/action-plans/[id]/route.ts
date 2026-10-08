import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { logActivity } from '@/lib/activity-log'
import { shortRef } from '@/lib/dashboard-aggregate'
import { canDeleteAP } from '@/lib/action-plan-status'
import { isHttpUrl } from '@/lib/utils'

function canViewAP(
  user: { role: string; companyId: string | null; divisionId: string | null; id: string },
  ap: { companyId: string; divisionId: string | null; picId: string }
) {
  if (user.role === 'SUPER_ADMIN') return true
  if (ap.companyId !== user.companyId) return false
  if (user.role === 'ADMIN_OPERATIONAL') return true
  if (user.role === 'MANAGER') return user.divisionId !== null && ap.divisionId === user.divisionId
  if (user.role === 'PIC') {
    return ap.picId === user.id || (user.divisionId !== null && ap.divisionId === user.divisionId)
  }
  return ap.picId === user.id
}

function canEditAP(
  user: { role: string; companyId: string | null; divisionId: string | null; id: string },
  ap: { companyId: string; divisionId: string | null; picId: string }
) {
  if (user.role === 'SUPER_ADMIN') return true
  if (ap.companyId !== user.companyId) return false
  if (user.role === 'ADMIN_OPERATIONAL') return true
  if (user.role === 'MANAGER') return user.divisionId !== null && ap.divisionId === user.divisionId
  return ap.picId === user.id
}

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const existing = await prisma.actionPlan.findUnique({
      where: { id },
      include: {
        pic: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
            supervisor: { select: { id: true, name: true, role: true } },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true, role: true } },
          },
        },
        division: { select: { id: true, name: true } },
        activityLogs: {
          select: {
            id: true,
            action: true,
            oldValue: true,
            newValue: true,
            createdAt: true,
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { comments: true } },
      },
    })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Action Plan not found' }, { status: 404 })
    }

    if (!canViewAP(user, existing)) {
      return NextResponse.json({ error: 'Action Plan not found' }, { status: 404 })
    }

    const [checklistTotal, checklistDone] = await Promise.all([
      prisma.checklist.count({ where: { actionPlanId: id } }),
      prisma.checklist.count({ where: { actionPlanId: id, isDone: true } }),
    ])

    const payload = {
      ...existing,
      code: shortRef(existing.id, 'AP'),
      commentCount: existing._count.comments,
      checklistDone,
      checklistTotal,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[ACTION_PLAN_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    if (!canEditAP(user, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    // Guard: jangan ubah evidence saat sedang di-review / sudah selesai
    const isEvidenceField = body.evidenceLink !== undefined || body.evaluationNote !== undefined
    if (isEvidenceField && ['PENDING_APPROVAL', 'COMPLETE', 'APPROVED'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Bukti tidak bisa diubah saat sedang review atau sudah selesai. Gunakan alur Submit / Review.' },
        { status: 409 }
      )
    }

    if (body.evidenceLink != null && body.evidenceLink !== '' && !isHttpUrl(body.evidenceLink)) {
      return NextResponse.json({ error: 'Link bukti harus diawali http:// atau https://' }, { status: 400 })
    }

    // body.status SELALU diabaikan — status hanya berubah lewat alur submit/review/reassign
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.outcomeKpi !== undefined) updateData.outcomeKpi = body.outcomeKpi
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.evidenceLink !== undefined) updateData.evidenceLink = body.evidenceLink ? body.evidenceLink.trim() : null
    if (body.evaluationNote !== undefined) updateData.evaluationNote = body.evaluationNote
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null

    const result = await prisma.actionPlan.update({ where: { id }, data: updateData })

    if (isEvidenceField) {
      await logActivity({
        userId: user.id,
        actionPlanId: id,
        action: 'UPDATED', // simpan draf bukti; EVIDENCE_SUBMITTED hanya di /submit
        oldValue: JSON.stringify({ evidenceLink: existing.evidenceLink, evaluationNote: existing.evaluationNote }),
        newValue: JSON.stringify({ evidenceLink: updateData.evidenceLink ?? existing.evidenceLink, evaluationNote: updateData.evaluationNote ?? existing.evaluationNote }),
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ACTION_PLAN_PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    if (!canEditAP(user, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!canDeleteAP(user, existing)) {
      return NextResponse.json(
        { error: 'Action Plan yang sudah diajukan/selesai hanya bisa dihapus Admin Operasional' },
        { status: 403 }
      )
    }

    await prisma.actionPlan.update({ where: { id }, data: { deletedAt: new Date() } })
    await logActivity({ userId: user.id, actionPlanId: id, action: 'DELETED', oldValue: existing.status })

    return NextResponse.json({ success: true, message: 'Action Plan softly deleted' })
  } catch (error) {
    console.error('[ACTION_PLAN_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
