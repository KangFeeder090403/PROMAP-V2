import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, canManageUsers } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'

type SessionUser = {
  id: string
  role: string
  companyId: string | null
}

type TargetUser = {
  id: string
  role: string
  companyId: string | null
  status: string
  deletedAt: Date | null
}

function validateStatusTarget(currentUser: SessionUser, targetId: string, existing: TargetUser | null): NextResponse | null {
  if (targetId === currentUser.id) {
    return NextResponse.json({ error: 'Tidak bisa mengubah status akun sendiri' }, { status: 400 })
  }
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }
  if (currentUser.role === 'ADMIN_OPERATIONAL' && existing.companyId !== currentUser.companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (currentUser.role === 'ADMIN_OPERATIONAL' && existing.role === 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

function validateStatusTransition(action: unknown, currentStatus: string): { newStatus?: 'ACTIVE' | 'INACTIVE'; error?: NextResponse } {
  if (action !== 'deactivate' && action !== 'reactivate') {
    return { error: NextResponse.json({ error: "action harus 'deactivate' atau 'reactivate'" }, { status: 400 }) }
  }

  // Hanya toggle ACTIVE <-> INACTIVE. PENDING tetap lewat /approve.
  if (action === 'deactivate' && currentStatus !== 'ACTIVE') {
    return { error: NextResponse.json({ error: 'Hanya user ACTIVE yang bisa dinonaktifkan' }, { status: 400 }) }
  }
  if (action === 'reactivate' && currentStatus !== 'INACTIVE') {
    return { error: NextResponse.json({ error: 'Hanya user INACTIVE yang bisa diaktifkan kembali' }, { status: 400 }) }
  }

  return { newStatus: action === 'deactivate' ? 'INACTIVE' : 'ACTIVE' }
}

async function notifyStatusChange(userId: string, isDeactivate: boolean, companyId?: string | null): Promise<void> {
  await notify({
    userIds: [userId],
    title: isDeactivate ? 'Akun Anda dinonaktifkan' : 'Akun Anda diaktifkan kembali',
    message: isDeactivate
      ? 'Akun Anda telah dinonaktifkan oleh administrator. Hubungi admin jika ini keliru.'
      : 'Akun Anda telah aktif kembali. Silakan login.',
    companyId: companyId ?? undefined,
  })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const roleError = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL'])(user)
    if (roleError) return roleError
    if (!canManageUsers(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = params
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, companyId: true, status: true, deletedAt: true },
    })

    const targetValidationError = validateStatusTarget(user, id, existing)
    if (targetValidationError) return targetValidationError

    const body = await req.json()
    const { newStatus, error: transitionError } = validateStatusTransition(body?.action, existing!.status)
    if (transitionError || !newStatus) return transitionError!

    const result = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, email: true, name: true, status: true, companyId: true },
    })

    await logActivity({
      userId: user.id,
      action: 'STATUS_CHANGED',
      oldValue: existing!.status,
      newValue: newStatus,
    })

    await notifyStatusChange(id, body.action === 'deactivate', result.companyId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[USER_STATUS]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
