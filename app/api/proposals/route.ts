import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const where: any = { ...proposalScope(user), deletedAt: null }
    if (status) where.status = status

    const data = await prisma.proposal.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(data)
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
        link: `/proposals/${result.id}`,
        companyId: user.companyId ?? undefined
      })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[PROPOSALS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
