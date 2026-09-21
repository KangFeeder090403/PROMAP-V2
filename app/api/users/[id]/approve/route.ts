import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, canManageUsers } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && existing.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (body.action !== 'approve' && body.action !== 'reject') {
      return NextResponse.json({ error: "action harus 'approve' atau 'reject'" }, { status: 400 })
    }

    const status = body.action === 'approve' ? 'ACTIVE' : 'INACTIVE'
    const result = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, name: true, status: true, companyId: true },
    })

    await notify({
      userIds: [id],
      title: body.action === 'approve' ? 'Akun Anda disetujui' : 'Akun Anda ditolak',
      message:
        body.action === 'approve'
          ? 'Akun Anda telah aktif. Silakan login.'
          : 'Akun Anda tidak disetujui. Hubungi admin perusahaan Anda.',
      companyId: result.companyId ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[USER_APPROVE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
