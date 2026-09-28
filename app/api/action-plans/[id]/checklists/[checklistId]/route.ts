import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope, canManageChecklist } from '@/lib/rbac'

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string; checklistId: string }> }
) {
  const params = await props.params;
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ap = await prisma.actionPlan.findFirst({
      where: { id: params.id, deletedAt: null, ...apScope(user) },
      select: { id: true, picId: true, status: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!canManageChecklist(user, ap)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const checklist = await prisma.checklist.findFirst({
      where: { id: params.checklistId, actionPlanId: ap.id },
    })
    if (!checklist) return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })

    const body = await req.json()
    const isDone = Boolean(body.isDone)

    const result = await prisma.checklist.update({
      where: { id: checklist.id },
      data: { isDone },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[AP_CHECKLIST_PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// EXCEPTION larangan-keras#4: Checklist bukan data transaksi utama, hard delete diizinkan by design (schema tidak punya deletedAt)
export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string; checklistId: string }> }
) {
  const params = await props.params;
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ap = await prisma.actionPlan.findFirst({
      where: { id: params.id, deletedAt: null, ...apScope(user) },
      select: { id: true, picId: true, status: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!canManageChecklist(user, ap)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const checklist = await prisma.checklist.findFirst({
      where: { id: params.checklistId, actionPlanId: ap.id },
    })
    if (!checklist) return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })

    await prisma.checklist.delete({ where: { id: checklist.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AP_CHECKLIST_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
