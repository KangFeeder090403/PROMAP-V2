import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canManageProject } from '@/lib/rbac'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canManageProject(user, existing.divisionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && existing.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // MANAGER tidak bisa ubah divisionId — field diabaikan
    if ((user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL') && body.divisionId !== undefined) {
      if (body.divisionId === null) {
        updateData.divisionId = null
      } else {
        const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
        if (!division || division.deletedAt || division.companyId !== existing.companyId) {
          return NextResponse.json({ error: 'Invalid divisionId' }, { status: 400 })
        }
        updateData.divisionId = body.divisionId
      }
    }

    const result = await prisma.project.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PROJECT_PUT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canManageProject(user, existing.divisionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && existing.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const activeTaskCount = await prisma.task.count({ where: { projectId: id, deletedAt: null } })
    if (activeTaskCount > 0) {
      return NextResponse.json({ error: 'Project masih punya Task aktif' }, { status: 409 })
    }

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({ success: true, message: 'Project softly deleted' })
  } catch (error) {
    console.error('[PROJECT_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
