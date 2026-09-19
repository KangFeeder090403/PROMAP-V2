import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import type { Prisma } from '@/lib/generated/prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? '100') || 100))
    const action = searchParams.get('action')
    const search = searchParams.get('search')?.trim()

    let baseScope: Prisma.ActivityLogWhereInput = {}

    // Cabang `project` wajib: saat SUPER_ADMIN konversi proposal lintas tenant,
    // log-nya punya user di company lain dan actionPlanId null — tanpa cabang ini
    // Admin Ops perusahaan penerima tidak pernah melihat project asing masuk.
    if (user.role === 'SUPER_ADMIN') {
      const companyId = searchParams.get('companyId')
      if (companyId) {
        baseScope = {
          OR: [
            { user: { companyId } },
            { actionPlan: { companyId } },
            { project: { companyId } },
          ],
        }
      }
    } else if (user.role === 'ADMIN_OPERATIONAL') {
      const cId = user.companyId!
      baseScope = {
        OR: [
          { user: { companyId: cId } },
          { actionPlan: { companyId: cId } },
          { project: { companyId: cId } },
        ],
      }
    } else if (user.role === 'MANAGER') {
      const cId = user.companyId!
      baseScope = user.divisionId
        ? {
            OR: [
              { user: { divisionId: user.divisionId } },
              { actionPlan: { divisionId: user.divisionId } },
              { project: { divisionId: user.divisionId } },
            ],
          }
        : {
            OR: [
              { user: { companyId: cId } },
              { actionPlan: { companyId: cId } },
              { project: { companyId: cId } },
            ],
          }
    } else {
      baseScope = {
        OR: [
          { userId: user.id },
          { actionPlan: { picId: user.id } },
        ],
      }
    }

    const andConditions: Prisma.ActivityLogWhereInput[] = [baseScope]

    if (action) {
      andConditions.push({ action })
    }

    if (search) {
      andConditions.push({
        OR: [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { actionPlan: { title: { contains: search, mode: 'insensitive' } } },
          { project: { name: { contains: search, mode: 'insensitive' } } },
          { oldValue: { contains: search, mode: 'insensitive' } },
          { newValue: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    const where: Prisma.ActivityLogWhereInput =
      andConditions.length === 1 ? andConditions[0] : { AND: andConditions }

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
            division: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
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
