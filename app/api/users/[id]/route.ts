import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, canManageUsers } from '@/lib/rbac'

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  status: true,
  companyId: true,
  divisionId: true,
  supervisorId: true,
  userLabelId: true,
  isGuest: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role === 'PIC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const target = await prisma.user.findUnique({ where: { id: params.id }, select: SAFE_SELECT })
    if (!target) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    if (user.role === 'ADMIN_OPERATIONAL' && target.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'MANAGER' && target.divisionId !== user.divisionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(target)
  } catch (error) {
    console.error('[USER_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roleError = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL'])(user)
    if (roleError) return roleError
    if (!canManageUsers(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && existing.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const companyId = existing.companyId
    const updateData: Record<string, unknown> = {}

    if (body.role !== undefined) {
      const ADMIN_OPERATIONAL_ASSIGNABLE = ['ADMIN_OPERATIONAL', 'MANAGER', 'PIC']
      if (user.role === 'ADMIN_OPERATIONAL' && !ADMIN_OPERATIONAL_ASSIGNABLE.includes(body.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (body.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      updateData.role = body.role
    }

    if (body.divisionId !== undefined) {
      if (body.divisionId === null) {
        updateData.divisionId = null
      } else {
        const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
        if (!division || division.deletedAt || division.companyId !== companyId) {
          return NextResponse.json({ error: 'divisionId tidak valid' }, { status: 400 })
        }
        updateData.divisionId = body.divisionId
      }
    }

    if (body.userLabelId !== undefined) {
      if (body.userLabelId === null) {
        updateData.userLabelId = null
      } else {
        const label = await prisma.userLabel.findUnique({ where: { id: body.userLabelId } })
        if (!label || label.deletedAt || label.companyId !== companyId) {
          return NextResponse.json({ error: 'userLabelId tidak valid' }, { status: 400 })
        }
        updateData.userLabelId = body.userLabelId
      }
    }

    if (body.supervisorId !== undefined) {
      if (body.supervisorId === null) {
        updateData.supervisorId = null
      } else {
        if (body.supervisorId === id) {
          return NextResponse.json({ error: 'supervisorId tidak boleh sama dengan diri sendiri' }, { status: 400 })
        }
        const supervisor = await prisma.user.findUnique({ where: { id: body.supervisorId } })
        if (!supervisor || supervisor.deletedAt || supervisor.companyId !== companyId) {
          return NextResponse.json({ error: 'supervisorId tidak valid' }, { status: 400 })
        }
        updateData.supervisorId = body.supervisorId
      }
    }

    const result = await prisma.user.update({
      where: { id },
      data: updateData,
      select: SAFE_SELECT,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[USER_PUT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
