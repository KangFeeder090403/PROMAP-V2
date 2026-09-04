import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope } from '@/lib/rbac'
import { aggregateDashboard } from '@/lib/dashboard-aggregate'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const actionPlans = await prisma.actionPlan.findMany({
      where: { ...apScope(user), deletedAt: null },
      select: { status: true, priority: true, picId: true, pic: { select: { name: true } } },
    })

    return NextResponse.json(aggregateDashboard(actionPlans))
  } catch (error) {
    console.error('[API_ERROR]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
