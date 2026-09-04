import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'

function inScope(user: { role: string; companyId: string | null; divisionId: string | null; id: string }, ap: { companyId: string; divisionId: string | null; picId: string }) {
  if (user.role === 'SUPER_ADMIN') return true
  if (user.role === 'ADMIN_OPERATIONAL') return ap.companyId === user.companyId
  if (user.role === 'MANAGER') return ap.divisionId === user.divisionId
  return ap.picId === user.id
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
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

    if (!inScope(user, existing)) {
      return NextResponse.json({ error: 'Action Plan not found' }, { status: 404 })
    }

    return NextResponse.json(existing)
  } catch (error) {
    console.error('[ACTION_PLAN_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

    if (!inScope(user, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    // body.status SELALU diabaikan — status hanya berubah lewat alur submit/review/reassign
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.outcomeKpi !== undefined) updateData.outcomeKpi = body.outcomeKpi
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null

    const result = await prisma.actionPlan.update({ where: { id }, data: updateData })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ACTION_PLAN_PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
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

    if (!inScope(user, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.actionPlan.update({ where: { id }, data: { deletedAt: new Date() } })

    return NextResponse.json({ success: true, message: 'Action Plan softly deleted' })
  } catch (error) {
    console.error('[ACTION_PLAN_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
