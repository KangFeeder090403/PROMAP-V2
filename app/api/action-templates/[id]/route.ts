import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, canManageActionTemplate } from '@/lib/rbac'
import { logActivity } from '@/lib/activity-log'
import type { User } from '@/lib/generated/prisma/client'

const MANAGE_ROLES = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'])

/** 401 → 403 role → 404 → 403 scope. Kembalikan template atau response error. */
async function loadManageable(id: string): Promise<
  | { error: NextResponse }
  | { user: User; template: { id: string; title: string; description: string | null; divisionId: string } }
> {
  const user = await getSessionUser()
  if (!user || user.role === 'GUEST') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const forbidden = MANAGE_ROLES(user)
  if (forbidden) return { error: forbidden }

  const template = await prisma.actionTemplate.findFirst({
    where: { id, deletedAt: null },
    include: { division: { select: { id: true, companyId: true } } },
  })
  if (!template) {
    return { error: NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 }) }
  }
  if (!canManageActionTemplate(user, template.division)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, template }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const loaded = await loadManageable(id)
    if ('error' in loaded) return loaded.error
    const { user, template } = loaded

    const body = await req.json()
    const { title, description } = body

    if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 200)) {
      return NextResponse.json({ error: 'Judul template wajib diisi (maks. 200 karakter)' }, { status: 400 })
    }
    if (description != null && (typeof description !== 'string' || description.trim().length > 1000)) {
      return NextResponse.json({ error: 'Deskripsi maksimal 1000 karakter' }, { status: 400 })
    }

    const updated = await prisma.actionTemplate.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: { division: { select: { id: true, name: true, companyId: true } } },
    })

    await logActivity({
      userId: user.id,
      action: 'UPDATED',
      oldValue: JSON.stringify({ entity: 'ActionTemplate', id, title: template.title, description: template.description }),
      newValue: JSON.stringify({ entity: 'ActionTemplate', id, title: updated.title, description: updated.description }),
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
    const loaded = await loadManageable(id)
    if ('error' in loaded) return loaded.error
    const { user, template } = loaded

    await prisma.actionTemplate.update({ where: { id }, data: { deletedAt: new Date() } })

    await logActivity({
      userId: user.id,
      action: 'DELETED',
      oldValue: JSON.stringify({ entity: 'ActionTemplate', id, title: template.title, divisionId: template.divisionId }),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ACTION_TEMPLATES_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
