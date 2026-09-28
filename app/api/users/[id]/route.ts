import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, canManageUsers } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  status: true,
  companyId: true,
  divisionId: true,
  supervisorId: true,
  userLabelId: true,
  isGuest: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role === 'PIC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const target = await prisma.user.findUnique({ where: { id: params.id }, select: SAFE_SELECT })
    if (!target) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    if (user.role === 'ADMIN_OPERATIONAL' && target.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'MANAGER' && target.divisionId !== user.divisionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(target)
  } catch (error) {
    console.error('[USER_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

const ADMIN_OPERATIONAL_ASSIGNABLE = ['ADMIN_OPERATIONAL', 'MANAGER', 'PIC']

function validateUserTarget(
  currentUser: { role: string; companyId: string | null },
  existing: { companyId: string | null; deletedAt: Date | null } | null
): NextResponse | null {
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }
  if (currentUser.role === 'ADMIN_OPERATIONAL' && existing.companyId !== currentUser.companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

function validateBasicProfile(body: { name?: unknown; phone?: unknown }): {
  updateData: Record<string, unknown>
  error?: NextResponse
} {
  const updateData: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const trimmed = String(body.name).trim()
    if (trimmed.length < 2) {
      return { error: NextResponse.json({ error: 'Nama minimal 2 karakter' }, { status: 400 }), updateData }
    }
    updateData.name = trimmed
  }

  if (body.phone !== undefined) {
    updateData.phone = body.phone ? String(body.phone).trim() : null
  }

  return { updateData }
}

function validateRoleChange(
  currentUserRole: string,
  newRole: unknown
): { role?: string; error?: NextResponse } {
  if (newRole === undefined) return {}

  const roleStr = String(newRole)
  if (currentUserRole === 'ADMIN_OPERATIONAL' && !ADMIN_OPERATIONAL_ASSIGNABLE.includes(roleStr)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  if (roleStr === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { role: roleStr }
}

async function validateUpdateRelations(
  companyId: string | null,
  targetUserId: string,
  body: { divisionId?: string | null; userLabelId?: string | null; supervisorId?: string | null }
): Promise<{ updateData: Record<string, unknown>; error?: NextResponse }> {
  const updateData: Record<string, unknown> = {}

  if (body.divisionId !== undefined) {
    if (body.divisionId === null) {
      updateData.divisionId = null
    } else {
      const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
      if (!division || division.deletedAt || division.companyId !== companyId) {
        return { error: NextResponse.json({ error: 'divisionId tidak valid' }, { status: 400 }), updateData }
      }
      updateData.divisionId = body.divisionId
    }
  }

  if (body.userLabelId !== undefined) {
    if (body.userLabelId === null) {
      updateData.userLabelId = null
    } else {
      const label = await prisma.userLabel.findUnique({ where: { id: body.userLabelId } })
      if (!label || label.deletedAt || label.companyId !== companyId) {
        return { error: NextResponse.json({ error: 'userLabelId tidak valid' }, { status: 400 }), updateData }
      }
      updateData.userLabelId = body.userLabelId
    }
  }

  if (body.supervisorId !== undefined) {
    if (body.supervisorId === null) {
      updateData.supervisorId = null
    } else {
      if (body.supervisorId === targetUserId) {
        return {
          error: NextResponse.json({ error: 'supervisorId tidak boleh sama dengan diri sendiri' }, { status: 400 }),
          updateData,
        }
      }
      const supervisor = await prisma.user.findUnique({ where: { id: body.supervisorId } })
      if (!supervisor || supervisor.deletedAt || supervisor.companyId !== companyId) {
        return { error: NextResponse.json({ error: 'supervisorId tidak valid' }, { status: 400 }), updateData }
      }
      updateData.supervisorId = body.supervisorId
    }
  }

  return { updateData }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roleError = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL'])(user)
    if (roleError) return roleError
    if (!canManageUsers(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params
    const existing = await prisma.user.findUnique({ where: { id } })
    const targetError = validateUserTarget(user, existing)
    if (targetError) return targetError

    const body = await req.json()
    const { updateData: basicData, error: basicError } = validateBasicProfile(body)
    if (basicError) return basicError

    const { role: newRole, error: roleUpdateError } = validateRoleChange(user.role, body.role)
    if (roleUpdateError) return roleUpdateError

    const { updateData: relData, error: relError } = await validateUpdateRelations(existing!.companyId, id, body)
    if (relError) return relError

    const updateData: Record<string, unknown> = {
      ...basicData,
      ...(newRole !== undefined ? { role: newRole } : {}),
      ...relData,
    }

    const result = await prisma.user.update({
      where: { id },
      data: updateData,
      select: SAFE_SELECT,
    })

    // Log perubahan
    await logActivity({
      userId: user.id,
      action: 'UPDATED',
      oldValue: JSON.stringify({ role: existing!.role, divisionId: existing!.divisionId, name: existing!.name, phone: existing!.phone }),
      newValue: JSON.stringify(updateData),
    })

    // Notifikasi ke user yang diedit (kalau bukan diri sendiri)
    if (id !== user.id) {
      await notify({
        userIds: [id],
        title: 'Profil Anda diperbarui',
        message: `Administrator telah memperbarui data profil Anda.`,
        companyId: existing!.companyId ?? undefined,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[USER_PUT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
