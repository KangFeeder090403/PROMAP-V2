import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import type { Prisma } from '@/lib/generated/prisma/client'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '50') || 50))
    const action = searchParams.get('action')

    let where: Prisma.ActivityLogWhereInput = {}

    if (user.role === 'SUPER_ADMIN') {
      const companyId = searchParams.get('companyId')
      if (companyId) {
        where = {
          OR: [
            { user: { companyId } },
            { actionPlan: { companyId } },
          ],
        }
      }
    } else if (user.role === 'ADMIN_OPERATIONAL') {
      const cId = user.companyId!
      where = {
        OR: [
          { user: { companyId: cId } },
          { actionPlan: { companyId: cId } },
        ],
      }
    } else if (user.role === 'MANAGER') {
      const cId = user.companyId!
      where = user.divisionId
        ? {
            OR: [
              { user: { divisionId: user.divisionId } },
              { actionPlan: { divisionId: user.divisionId } },
            ],
          }
        : {
            OR: [
              { user: { companyId: cId } },
              { actionPlan: { companyId: cId } },
            ],
          }
    } else {
      where = {
        OR: [
          { userId: user.id },
          { actionPlan: { picId: user.id } },
        ],
      }
    }

    if (action) {
      where.action = action
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            companyId: true,
            divisionId: true,
          },
        },
        actionPlan: {
          select: {
            id: true,
            title: true,
            companyId: true,
            divisionId: true,
          },
        },
      },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('[AUDIT_LOGS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
