import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, companyScope, requireRole } from '@/lib/rbac'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where = companyScope(user)

    const data = await prisma.company.findMany({
      where: { ...where, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[COMPANIES_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Role check: Only SUPER_ADMIN can create a new company
    const roleError = requireRole(['SUPER_ADMIN'])(user)
    if (roleError) return roleError

    const body = await req.json()

    // Minimal validation
    if (!body.name || !body.uniqueCode) {
      return NextResponse.json({ error: 'Name and uniqueCode are required' }, { status: 400 })
    }

    const result = await prisma.company.create({
      data: {
        name: body.name,
        uniqueCode: body.uniqueCode,
        logoUrl: body.logoUrl,
        subscription: body.subscription || 'BASIC',
        isActive: body.isActive ?? true
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('[COMPANIES_POST]', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Company code already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}