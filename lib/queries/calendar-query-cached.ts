import { prisma } from '@/lib/prisma'
import { projectScope, divisionScope } from '@/lib/rbac'
import type { User } from '@/lib/generated/prisma/client'
import { shortRef } from '@/lib/dashboard-aggregate'
import { buildCalendarWhere } from '@/lib/calendar-query'
import { resolveCalendarRange, type CalendarEvent } from '@/lib/calendar-grid'
import { AP_STATUS_LABEL, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import { unstable_cache } from 'next/cache'

export interface CalendarFilterOptions {
  statuses: { key: string; label: string }[]
  priorities: { key: string; label: string }[]
  pics: { id: string; name: string; division?: { name: string } | null }[]
  projects: { id: string; name: string }[]
  divisions: { id: string; name: string }[]
}

export async function fetchCalendarFilterOptionsRaw(user: User): Promise<CalendarFilterOptions> {
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

  return {
    statuses,
    priorities,
    pics,
    projects: [
      { id: 'personal', name: 'Personal (Tanpa Project)' },
      ...projects,
    ],
    divisions,
  }
}

export async function getCalendarFilterOptions(user: User): Promise<CalendarFilterOptions> {
  const cacheKey = [
    'calendar-filters',
    user.role,
    user.companyId ?? 'all',
    user.divisionId ?? 'all',
    // projectScope() memfilter PIC by picId === user.id — tanpa ini dua PIC
    // di perusahaan+divisi sama berbagi satu cache entry (kebocoran antar-user).
    user.id,
  ]

  return unstable_cache(
    async () => fetchCalendarFilterOptionsRaw(user),
    cacheKey,
    {
      revalidate: 120, // 2 minutes
      tags: [`calendar-filters-${user.companyId ?? 'all'}`],
    }
  )()
}

export async function getCalendarEvents(
  user: User,
  from: Date,
  to: Date,
  filters?: {
    status?: string | null
    priority?: string | null
    divisionId?: string | null
    picId?: string | null
    projectId?: string | null
  }
): Promise<CalendarEvent[]> {
  const where = buildCalendarWhere(user, from, to, filters)

  const data = await prisma.actionPlan.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      startDate: true,
      endDate: true,
      picId: true,
      divisionId: true,
      pic: { select: { id: true, name: true, userLabel: { select: { name: true } } } },
      task: { select: { projectId: true, project: { select: { id: true, name: true } } } },
      division: { select: { id: true, name: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  return data.map((ap) => ({
    id: ap.id,
    code: shortRef(ap.id, 'AP'),
    title: ap.title,
    status: ap.status,
    priority: ap.priority,
    startDate: ap.startDate.toISOString(),
    endDate: ap.endDate.toISOString(),
    picId: ap.picId,
    picName: ap.pic.name,
    labelName: ap.pic.userLabel?.name ?? '-',
    projectId: ap.task?.projectId ?? ap.task?.project?.id ?? null,
    projectName: ap.task?.project?.name ?? 'Personal',
    divisionId: ap.divisionId ?? ap.division?.id ?? null,
    divisionName: ap.division?.name ?? '-',
  }))
}

import { getGuestDummyData } from '@/lib/guest-dummy-data'

export async function getCalendarInitialData(user: User) {
  const now = new Date()

  if (user.role === 'GUEST') {
    const dummy = getGuestDummyData(now)
    const filterOptions: CalendarFilterOptions = {
      statuses: [
        { key: 'NOT_STARTED', label: 'Belum Mulai' },
        { key: 'IN_PROGRESS', label: 'Dalam Pengerjaan' },
        { key: 'PENDING_APPROVAL', label: 'Menunggu Approval' },
        { key: 'EVIDENCE_REQUIRED', label: 'Perlu Bukti' },
        { key: 'APPROVED', label: 'Disetujui' },
        { key: 'OVERDUE', label: 'Lewat Tenggat' },
        { key: 'COMPLETE', label: 'Selesai' },
      ],
      priorities: [
        { key: 'HIGH', label: 'Tinggi' },
        { key: 'MEDIUM', label: 'Sedang' },
        { key: 'LOW', label: 'Rendah' },
      ],
      pics: [{ id: 'guest-hendra-wijaya', name: 'Hendra Wijaya', division: { name: 'IT Operasional' } }],
      projects: [
        { id: 'personal', name: 'Personal (Tanpa Project)' },
        { id: 'proj-demo-1', name: 'Transformasi Digital Operasional 2026' },
        { id: 'proj-demo-2', name: 'Modernisasi Infrastruktur & DevOps' },
      ],
      divisions: [{ id: 'demo-division-id', name: 'IT Operasional' }],
    }
    const events: CalendarEvent[] = dummy.actionPlans.map((a) => ({
      id: a.id,
      code: shortRef(a.id, 'AP'),
      title: a.title,
      status: a.status,
      priority: a.priority,
      startDate: a.createdAt.toISOString(),
      endDate: a.endDate.toISOString(),
      picId: a.picId,
      picName: a.pic.name,
      labelName: 'Manager',
      projectId: 'proj-demo-1',
      projectName: 'Transformasi Digital Operasional 2026',
      divisionId: 'demo-division-id',
      divisionName: 'IT Operasional',
    }))
    return { filterOptions, events }
  }

  const range = resolveCalendarRange('month', now)
  const from = new Date(range.from)
  const to = new Date(range.to)

  const [filterOptions, events] = await Promise.all([
    getCalendarFilterOptions(user),
    getCalendarEvents(user, from, to),
  ])

  return { filterOptions, events }
}
