import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const user = await getSessionUser()
    if (!user || user.role === 'GUEST') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.actionTemplate.findUnique({
      where: { id },
      include: { division: true },
    })
    if (!template) {
      return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 })
    }

    // Guard scope
    if (user.role === 'MANAGER' && template.divisionId !== user.divisionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && template.division.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description } = body

    if (title !== undefined && !title?.trim()) {
      return NextResponse.json({ error: 'Judul template wajib diisi' }, { status: 400 })
    }

    const updated = await prisma.actionTemplate.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: { division: { select: { id: true, name: true, companyId: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[ACTION_TEMPLATES_PUT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const user = await getSessionUser()
    if (!user || user.role === 'GUEST') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.actionTemplate.findUnique({
      where: { id },
      include: { division: true },
    })
    if (!template) {
      return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 })
    }

    if (user.role === 'MANAGER' && template.divisionId !== user.divisionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && template.division.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.actionTemplate.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ACTION_TEMPLATES_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
