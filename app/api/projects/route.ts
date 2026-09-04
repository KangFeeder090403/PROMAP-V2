import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, projectScope, canManageProject } from '@/lib/rbac'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await prisma.project.findMany({
      where: { ...projectScope(user), deletedAt: null },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[PROJECTS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // MANAGER selalu create di divisinya sendiri — pass user.divisionId sbg existingDivisionId
    if (!canManageProject(user, user.divisionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    let companyId: string
    let divisionId: string | null = null

    if (user.role === 'SUPER_ADMIN') {
      if (!body.companyId) {
        return NextResponse.json({ error: 'companyId is required for SUPER_ADMIN' }, { status: 400 })
      }
      const company = await prisma.company.findUnique({ where: { id: body.companyId } })
      if (!company || company.deletedAt) {
        return NextResponse.json({ error: 'Invalid companyId' }, { status: 400 })
      }
      companyId = body.companyId

      if (body.divisionId) {
        const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
        if (!division || division.deletedAt || division.companyId !== companyId) {
          return NextResponse.json({ error: 'Invalid divisionId' }, { status: 400 })
        }
        divisionId = body.divisionId
      }
    } else if (user.role === 'ADMIN_OPERATIONAL') {
      companyId = user.companyId!

      if (body.divisionId) {
        const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
        if (!division || division.deletedAt || division.companyId !== companyId) {
          return NextResponse.json({ error: 'Invalid divisionId' }, { status: 400 })
        }
        divisionId = body.divisionId
      }
    } else {
      // MANAGER
      companyId = user.companyId!
      divisionId = user.divisionId
    }

    const result = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        companyId,
        divisionId,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        createdById: user.id
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[PROJECTS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
