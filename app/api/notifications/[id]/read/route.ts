import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Defense in depth — pastikan notif ini benar milik user sebelum update.
    const existing = await prisma.notification.findFirst({
      where: { id: params.id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const result = await prisma.notification.update({
      where: { id: params.id },
      data: { isRead: true },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[NOTIFICATION_READ]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
