import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope, proposalScope, projectScope } from '@/lib/rbac'
import { buildPortfolio } from '@/lib/dashboard-portfolio'
import { aggregateDashboard } from '@/lib/dashboard-aggregate'
import type { Prisma, ProposalStatus, Role } from '@/lib/generated/prisma/client'

const RANGES = ['today', 'week', 'month', 'quarter', 'all'] as const
type Range = (typeof RANGES)[number]

/** Batas atas baris AP per request — melindungi range=all dari query tak terbatas. */
const AP_QUERY_CAP = 2000

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_OPERATIONAL: 'Admin Operasional',
  MANAGER: 'Manager',
  PIC: 'PIC',
  GUEST: 'Guest',
}

function timeGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'Selamat Pagi'
  if (h >= 11 && h < 15) return 'Selamat Siang'
  if (h >= 15 && h < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}

function startOfWindow(range: Range) {
  const now = new Date()
  const start = new Date(now)
  if (range === 'today') start.setHours(0, 0, 0, 0)
  if (range === 'week') {
    const dayFromMonday = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - dayFromMonday)
    start.setHours(0, 0, 0, 0)
  }
  if (range === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }
  if (range === 'quarter') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1)
    start.setHours(0, 0, 0, 0)
  }
  return start
}

function isRange(value: unknown): value is Range {
  return typeof value === 'string' && (RANGES as readonly string[]).includes(value)
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rangeParam = req.nextUrl.searchParams.get('range')
    const range: Range = isRange(rangeParam) ? rangeParam : 'week'

    // Filter PIC personal. Digabung lewat AND, BUKAN spread: untuk role PIC apScope()
    // sudah mengunci { picId: user.id } dan spread akan menimpanya (kebocoran data).
    const picParam = req.nextUrl.searchParams.get('pic')
    const picFilter = picParam && picParam.trim() !== '' ? picParam.trim() : null

    const windowWhere: Prisma.ActionPlanWhereInput | null =
      range === 'all'
        ? null
        : { OR: [{ endDate: { gte: startOfWindow(range) } }, { status: 'OVERDUE' }] }

    const where: Prisma.ActionPlanWhereInput = {
      AND: [
        apScope(user),
        { deletedAt: null },
        ...(windowWhere ? [windowWhere] : []),
        ...(picFilter ? [{ picId: picFilter }] : []),
      ],
    }

    const actionPlans = await prisma.actionPlan.findMany({
      where,
      // range=all membuka seluruh riwayat; tanpa cap + orderBy, baris mana yang
      // terpotong tidak terprediksi (SUPER_ADMIN membaca lintas tenant).
      orderBy: { endDate: 'desc' },
      take: AP_QUERY_CAP,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        picId: true,
        pic: { select: { name: true } },
        outcomeKpi: true,
        evidenceLink: true,
        endDate: true,
        createdAt: true,
      },
    })

    const proposalWhere: Prisma.ProposalWhereInput = {
      AND: [
        proposalScope(user),
        { deletedAt: null, status: 'SUBMITTED' },
        ...(picFilter ? [{ proposerId: picFilter }] : []),
      ],
    }

    const proposals = await prisma.proposal.findMany({
      where: proposalWhere,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        proposer: { select: { name: true } },
        createdAt: true,
      },
    })

    const userDetail = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        role: true,
        division: { select: { name: true } },
        company: { select: { name: true } },
        userLabel: { select: { name: true } },
      },
    })

    // Helicopter view — scope project mengikuti projectScope (Manager = divisinya).
    const portfolioProjects = await prisma.project.findMany({
      where: { ...projectScope(user), deletedAt: null, isActive: true },
      select: { id: true, name: true, endDate: true, divisionId: true },
      take: 200,
    })
    const portfolioTasks = portfolioProjects.length
      ? await prisma.task.findMany({
          where: { projectId: { in: portfolioProjects.map((p) => p.id) }, deletedAt: null },
          select: { projectId: true, divisionId: true, title: true, status: true, endDate: true },
        })
      : []
    const portfolioDivisions = await prisma.division.findMany({
      where: {
        id: {
          in: [
            ...new Set([
              ...portfolioProjects.map((p) => p.divisionId),
              ...portfolioTasks.map((t) => t.divisionId),
            ].filter(Boolean)),
          ] as string[],
        },
      },
      select: { id: true, name: true },
    })
    const portfolio = buildPortfolio(
      portfolioProjects,
      portfolioTasks,
      new Map(portfolioDivisions.map((d) => [d.id, d.name]))
    )

    const agg = aggregateDashboard(
      actionPlans,
      proposals.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status as ProposalStatus,
        proposerName: p.proposer.name,
        createdAt: p.createdAt,
      }))
    )

    return NextResponse.json({
      ...agg,
      portfolio,
      user: {
        name: userDetail?.name ?? user.name,
        roleLabel: ROLE_LABEL[userDetail?.role ?? user.role],
        divisionName: userDetail?.division?.name ?? null,
        companyName: userDetail?.company?.name ?? null,
        title: userDetail?.userLabel?.name ?? null,
      },
      greeting: timeGreeting(),
    })
  } catch (error) {
    console.error('[API_ERROR]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
