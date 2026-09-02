import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roleError = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL'])(user)
    if (roleError) return roleError

    const { id } = params
    const existing = await prisma.userLabel.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Label tidak ditemukan' }, { status: 404 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && existing.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (body.action !== 'approve' && body.action !== 'reject') {
      return NextResponse.json({ error: "action harus 'approve' atau 'reject'" }, { status: 400 })
    }

    const status = body.action === 'approve' ? 'ACTIVE' : 'REJECTED'
    const result = await prisma.userLabel.update({
      where: { id },
      data: { status, approvedById: user.id },
    })

    if (existing.requestedById) {
      await notify({
        userIds: [existing.requestedById],
        title: body.action === 'approve' ? 'Label jabatan disetujui' : 'Label jabatan ditolak',
        message: `Label "${result.name}" yang Anda usulkan telah ${body.action === 'approve' ? 'disetujui' : 'ditolak'}.`,
        link: `/settings/user-labels`,
        companyId: existing.companyId,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[USER_LABEL_APPROVE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
