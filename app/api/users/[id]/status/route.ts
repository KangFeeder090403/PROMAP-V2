import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, canManageUsers } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const roleError = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL'])(user)
    if (roleError) return roleError
    if (!canManageUsers(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = params
    // Tidak boleh deactivate diri sendiri
    if (id === user.id) {
      return NextResponse.json({ error: 'Tidak bisa mengubah status akun sendiri' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && existing.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // ADMIN_OPERATIONAL tidak boleh deactivate SUPER_ADMIN
    if (user.role === 'ADMIN_OPERATIONAL' && existing.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (body.action !== 'deactivate' && body.action !== 'reactivate') {
      return NextResponse.json({ error: "action harus 'deactivate' atau 'reactivate'" }, { status: 400 })
    }

    // Hanya toggle ACTIVE <-> INACTIVE. PENDING tetap lewat /approve.
    if (body.action === 'deactivate' && existing.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Hanya user ACTIVE yang bisa dinonaktifkan' }, { status: 400 })
    }
    if (body.action === 'reactivate' && existing.status !== 'INACTIVE') {
      return NextResponse.json({ error: 'Hanya user INACTIVE yang bisa diaktifkan kembali' }, { status: 400 })
    }

    const newStatus = body.action === 'deactivate' ? 'INACTIVE' : 'ACTIVE'
    const result = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, email: true, name: true, status: true, companyId: true },
    })

    await logActivity({
      userId: user.id,
      action: 'STATUS_CHANGED',
      oldValue: existing.status,
      newValue: newStatus,
    })

    await notify({
      userIds: [id],
      title: body.action === 'deactivate' ? 'Akun Anda dinonaktifkan' : 'Akun Anda diaktifkan kembali',
      message: body.action === 'deactivate'
        ? 'Akun Anda telah dinonaktifkan oleh administrator. Hubungi admin jika ini keliru.'
        : 'Akun Anda telah aktif kembali. Silakan login.',
      companyId: result.companyId ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[USER_STATUS]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
