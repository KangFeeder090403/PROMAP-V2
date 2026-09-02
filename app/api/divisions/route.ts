import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, divisionScope, requireRole } from '@/lib/rbac'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where = divisionScope(user)
    if (where.id === '__none__') {
      return NextResponse.json([])
    }

    const data = await prisma.division.findMany({
      where: { ...where, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[DIVISIONS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roleError = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL'])(user)
    if (roleError) return roleError

    const body = await req.json()

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Inject companyId for ADMIN_OPERATIONAL, SUPER_ADMIN must provide it in body
    let targetCompanyId = user.companyId
    if (user.role === 'SUPER_ADMIN') {
      if (!body.companyId) {
        return NextResponse.json({ error: 'companyId is required for SUPER_ADMIN' }, { status: 400 })
      }
      targetCompanyId = body.companyId
    }

    if (!targetCompanyId) {
      return NextResponse.json({ error: 'Company ID is missing' }, { status: 400 })
    }

    const result = await prisma.division.create({
      data: {
        name: body.name,
        description: body.description,
        companyId: targetCompanyId
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('[DIVISIONS_POST]', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Division name already exists in this company' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}