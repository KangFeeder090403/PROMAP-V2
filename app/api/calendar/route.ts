import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { buildCalendarWhere } from '@/lib/calendar-query'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const fromRaw = searchParams.get('from')
    const toRaw = searchParams.get('to')
    if (!fromRaw || !toRaw) {
      return NextResponse.json({ error: 'from dan to wajib diisi' }, { status: 400 })
    }
    const from = new Date(fromRaw)
    const to = new Date(toRaw)
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'from atau to bukan tanggal valid' }, { status: 400 })
    }

    const where = buildCalendarWhere(user, from, to)

    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const divisionId = searchParams.get('divisionId')
    if (status) where.status = status as any
    if (priority) where.priority = priority as any
    if (divisionId) where.divisionId = divisionId

    const data = await prisma.actionPlan.findMany({
      where,
      include: {
        pic: { select: { name: true, userLabel: { select: { name: true } } } },
        task: { select: { project: { select: { name: true } } } },
        division: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    const flattened = data.map((ap) => ({
      id: ap.id,
      title: ap.title,
      status: ap.status,
      priority: ap.priority,
      startDate: ap.startDate,
      endDate: ap.endDate,
      picName: ap.pic.name,
      labelName: ap.pic.userLabel?.name ?? '-',
      projectName: ap.task?.project.name ?? 'Personal',
      divisionName: ap.division?.name ?? '-',
    }))

    return NextResponse.json(flattened)
  } catch (error) {
    console.error('[CALENDAR_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
