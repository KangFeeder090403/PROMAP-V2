import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, templateScope, canManageActionTemplate } from '@/lib/rbac'
import { logActivity } from '@/lib/activity-log'

const MANAGE_ROLES = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'])

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role === 'GUEST') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const forbidden = MANAGE_ROLES(user)
    if (forbidden) return forbidden

    const scope = templateScope(user)
    if (!scope) return NextResponse.json([])

    const templates = await prisma.actionTemplate.findMany({
      where: { ...scope, deletedAt: null },
      include: { division: { select: { id: true, name: true, companyId: true } } },
      orderBy: [{ division: { name: 'asc' } }, { title: 'asc' }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('[ACTION_TEMPLATES_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role === 'GUEST') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const forbidden = MANAGE_ROLES(user)
    if (forbidden) return forbidden

    const body = await req.json()
    const { title, description, divisionId } = body

    if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) {
      return NextResponse.json({ error: 'Judul template wajib diisi (maks. 200 karakter)' }, { status: 400 })
    }
    if (description != null && (typeof description !== 'string' || description.trim().length > 1000)) {
      return NextResponse.json({ error: 'Deskripsi maksimal 1000 karakter' }, { status: 400 })
    }
    // Wajib sebelum findFirst: Prisma menganggap { id: undefined } sebagai tanpa filter.
    if (typeof divisionId !== 'string' || !divisionId) {
      return NextResponse.json({ error: 'Divisi wajib dipilih' }, { status: 400 })
    }

    const division = await prisma.division.findFirst({
      where: { id: divisionId, deletedAt: null },
      select: { id: true, companyId: true },
    })
    if (!division) {
      return NextResponse.json({ error: 'Divisi tidak ditemukan' }, { status: 404 })
    }
    if (!canManageActionTemplate(user, division)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const template = await prisma.actionTemplate.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        divisionId,
      },
      include: { division: { select: { id: true, name: true, companyId: true } } },
    })

    await logActivity({
      userId: user.id,
      action: 'CREATED',
      newValue: JSON.stringify({ entity: 'ActionTemplate', id: template.id, title: template.title, divisionId }),
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('[ACTION_TEMPLATES_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
