import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma, ProposalStatus } from '@/lib/generated/prisma/client'
import { getSessionUser, proposalScope } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim()
    const sortBy = searchParams.get('sortBy') ?? 'newest'

    const baseWhere: Prisma.ProposalWhereInput = { ...proposalScope(user), deletedAt: null }
    const where: Prisma.ProposalWhereInput = { ...baseWhere }

    if (status) {
      where.status = status as ProposalStatus
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    let orderBy: Prisma.ProposalOrderByWithRelationInput = { createdAt: 'desc' }
    if (sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' }
    } else if (sortBy === 'title') {
      orderBy = { title: 'asc' }
    }

    // Hitung status counts secara server-side dari basis seluruh in-scope proposal
    const statusGroups = await prisma.proposal.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    })

    const counts: Record<string, number> = {
      all: 0,
      DRAFT: 0,
      SUBMITTED: 0,
      APPROVED: 0,
      REJECTED: 0,
    }
    for (const g of statusGroups) {
      counts[g.status] = g._count._all
      counts.all += g._count._all
    }

    const data = await prisma.proposal.findMany({
      where,
      orderBy,
      include: {
        proposer: {
          select: {
            id: true,
            name: true,
            role: true,
            divisionId: true,
            companyId: true,
          },
        },
      },
    })

    return NextResponse.json({ items: data, counts })
  } catch (error) {
    console.error('[PROPOSALS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'title and description are required' }, { status: 400 })
    }

    const status = body.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT'

    const result = await prisma.proposal.create({
      data: {
        title: body.title,
        description: body.description,
        status,
        proposerId: user.id
      }
    })

    if (status === 'SUBMITTED' && user.divisionId) {
      const managers = await prisma.user.findMany({
        where: { role: 'MANAGER', divisionId: user.divisionId, deletedAt: null, status: 'ACTIVE' }
      })
      await notify({
        userIds: managers.map((m) => m.id),
        title: 'Proposal baru',
        message: `${user.name} mengajukan proposal: ${result.title}`,
        link: '/proposals',
        companyId: user.companyId ?? undefined
      })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[PROPOSALS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
