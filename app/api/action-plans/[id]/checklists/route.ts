import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope, canManageChecklist } from '@/lib/rbac'
import { checklistItemSchema } from '@/lib/validations/actionPlan'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // apScope dulu untuk verifikasi akses baca AP induk — sama seperti comments/route.ts
    const ap = await prisma.actionPlan.findFirst({
      where: { id: params.id, deletedAt: null, ...apScope(user) },
      select: { id: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const checklists = await prisma.checklist.findMany({
      where: { actionPlanId: ap.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(checklists)
  } catch (error) {
    console.error('[AP_CHECKLISTS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = checklistItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
    }

    // apScope dulu untuk verifikasi akses baca AP induk, baru guard ownership PIC
    const ap = await prisma.actionPlan.findFirst({
      where: { id: params.id, deletedAt: null, ...apScope(user) },
      select: { id: true, picId: true, status: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!canManageChecklist(user, ap)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const checklist = await prisma.checklist.create({
      data: { actionPlanId: ap.id, title: parsed.data.title },
    })

    return NextResponse.json(checklist, { status: 201 })
  } catch (error) {
    console.error('[AP_CHECKLISTS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
