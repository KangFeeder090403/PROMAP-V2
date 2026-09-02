import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole } from '@/lib/rbac'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roleError = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL'])(user)
    if (roleError) return roleError

    const { id } = params

    // IDOR Check
    if (user.role === 'ADMIN_OPERATIONAL' && user.companyId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Existing check
    const existing = await prisma.company.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const body = await req.json()

    // For ADMIN_OPERATIONAL, prevent changing some sensitive fields if necessary (like subscription, uniqueCode)
    // but the requirement doesn't specify field level permissions, just IDOR check.
    // We'll update the provided fields.
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // Only SUPER_ADMIN can change subscription and uniqueCode
    if (user.role === 'SUPER_ADMIN') {
      if (body.subscription !== undefined) updateData.subscription = body.subscription
      if (body.uniqueCode !== undefined) updateData.uniqueCode = body.uniqueCode
    }

    const result = await prisma.company.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[COMPANY_PUT]', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Company code already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Role check: Only SUPER_ADMIN can delete a company
    const roleError = requireRole(['SUPER_ADMIN'])(user)
    if (roleError) return roleError

    const { id } = params

    // Existing check
    const existing = await prisma.company.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Soft delete cascade transaction
    const now = new Date()

    await prisma.$transaction([
      prisma.company.update({
        where: { id },
        data: { deletedAt: now }
      }),
      prisma.division.updateMany({
        where: { companyId: id, deletedAt: null },
        data: { deletedAt: now }
      }),
      prisma.user.updateMany({
        where: { companyId: id, deletedAt: null },
        data: { deletedAt: now }
      }),
      prisma.project.updateMany({
        where: { companyId: id, deletedAt: null },
        data: { deletedAt: now }
      })
    ])

    return NextResponse.json({ success: true, message: 'Company and related entities softly deleted' })
  } catch (error) {
    console.error('[COMPANY_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}