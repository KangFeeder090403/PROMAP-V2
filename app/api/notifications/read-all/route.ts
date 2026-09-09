import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'

export async function POST() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error('[NOTIFICATIONS_READ_ALL]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
