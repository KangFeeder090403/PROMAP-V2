import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canManageProject } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { createProjectWithTasks, ProjectInputError } from '@/lib/projects'
import { getProjectsData } from '@/lib/queries/projects-query'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const data = await getProjectsData(user, { sortBy, sortOrder })
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

    const { project, pics } = await prisma.$transaction((tx) =>
      createProjectWithTasks(tx, user, {
        name: body.name,
        description: body.description ?? null,
        companyId: body.companyId ?? null,
        divisionId: body.divisionId ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        picIds: body.picIds,
      })
    )

    if (pics.length > 0) {
      await notify({
        userIds: pics.map((p) => p.id),
        title: 'Ditugaskan ke Project Baru',
        message: `Kamu telah ditugaskan ke project "${project.name}" sebagai PIC.`,
        link: `/projects/${project.id}`,
        companyId: project.companyId,
      })
    }

    try {
      revalidateTag(`projects-${project.companyId ?? 'all'}`)
    } catch {
      // ignore outside request context
    }

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof ProjectInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PROJECTS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
