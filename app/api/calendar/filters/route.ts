import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, projectScope, divisionScope } from '@/lib/rbac'
import { AP_STATUS_LABEL, AP_PRIORITY_LABEL } from '@/lib/status-labels'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const statuses = [
      'NOT_STARTED',
      'IN_PROGRESS',
      'PENDING_APPROVAL',
      'EVIDENCE_REQUIRED',
      'APPROVED',
      'REJECTED',
      'OVERDUE',
      'COMPLETE',
    ].map((key) => ({
      key,
      label: AP_STATUS_LABEL[key] ?? key,
    }))

    const priorities = ['HIGH', 'MEDIUM', 'LOW'].map((key) => ({
      key,
      label: AP_PRIORITY_LABEL[key] ?? key,
    }))

    const [pics, projects, divisions] = await Promise.all([
      prisma.user.findMany({
        where: {
          companyId: user.companyId ?? undefined,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          division: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.project.findMany({
        where: {
          ...projectScope(user),
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.division.findMany({
        where: {
          ...divisionScope(user),
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({
      statuses,
      priorities,
      pics,
      projects: [
        { id: 'personal', name: 'Personal (Tanpa Project)' },
        ...projects,
      ],
      divisions,
    })
  } catch (error) {
    console.error('[CALENDAR_FILTERS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
