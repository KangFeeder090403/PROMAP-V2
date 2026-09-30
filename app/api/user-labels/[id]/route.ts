import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole } from '@/lib/rbac'

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    // Soft delete — larangan keras hapus data permanen.
    await prisma.userLabel.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true, message: 'Label softly deleted' })
  } catch (error) {
    console.error('[USER_LABEL_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
