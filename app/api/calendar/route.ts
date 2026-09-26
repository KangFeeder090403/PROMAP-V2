import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { shortRef } from '@/lib/dashboard-aggregate'
import {
  buildCalendarWhere,
  resolveDateRange,
  getQuarterlyAggregation,
} from '@/lib/calendar-query'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)

    // Agregasi kuartal khusus jika diminta via query parameter aggregate=quarter
    const aggregate = searchParams.get('aggregate')
    if (aggregate === 'quarter') {
      const year = Number(searchParams.get('year')) || new Date().getFullYear()
      const aggResult = await getQuarterlyAggregation(user, year)
      return NextResponse.json(aggResult)
    }

    const fromRaw = searchParams.get('from')
    const toRaw = searchParams.get('to')
    const dateRange = searchParams.get('dateRange')
    const quarter = searchParams.get('quarter')
    const yearRaw = searchParams.get('year')

    // Validasi dasar: harus ada minimal from/to ATAU dateRange/quarter
    if (!fromRaw && !toRaw && !dateRange && !quarter) {
      return NextResponse.json(
        { error: 'Parameter from & to atau dateRange/quarter wajib diisi' },
        { status: 400 }
      )
    }

    const { from, to } = resolveDateRange({
      from: fromRaw,
      to: toRaw,
      dateRange,
      quarter,
      year: yearRaw,
    })

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Rentang tanggal tidak valid' }, { status: 400 })
    }

    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const divisionId = searchParams.get('divisionId')
    const picId = searchParams.get('picId')
    const projectId = searchParams.get('projectId')

    const where = buildCalendarWhere(user, from, to, {
      status,
      priority,
      divisionId,
      picId,
      projectId,
    })

    const data = await prisma.actionPlan.findMany({
      where,
      include: {
        pic: { select: { id: true, name: true, userLabel: { select: { name: true } } } },
        task: { select: { projectId: true, project: { select: { id: true, name: true } } } },
        division: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    const flattened = data.map((ap) => ({
      id: ap.id,
      code: shortRef(ap.id, 'AP'),
      title: ap.title,
      status: ap.status,
      priority: ap.priority,
      startDate: ap.startDate,
      endDate: ap.endDate,
      picId: ap.picId,
      picName: ap.pic.name,
      labelName: ap.pic.userLabel?.name ?? '-',
      projectId: ap.task?.projectId ?? ap.task?.project?.id ?? null,
      projectName: ap.task?.project?.name ?? 'Personal',
      divisionId: ap.divisionId ?? ap.division?.id ?? null,
      divisionName: ap.division?.name ?? '-',
    }))

    // Jika client meminta payload lengkap beserta kuartal summary
    if (searchParams.get('includeQuarters') === 'true') {
      const targetYear = Number(yearRaw) || from.getFullYear()
      const quarterSummary = await getQuarterlyAggregation(user, targetYear)
      return NextResponse.json({
        events: flattened,
        quarterSummary,
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
      })
    }

    return NextResponse.json(flattened)
  } catch (error) {
    console.error('[CALENDAR_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
