import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, proposalScope, canEditProposal } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const proposal = await prisma.proposal.findFirst({
      where: { id, ...proposalScope(user), deletedAt: null }
    })
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    return NextResponse.json(proposal)
  } catch (error) {
    console.error('[PROPOSAL_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const existing = await prisma.proposal.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    if (!canEditProposal(user, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (body.action !== undefined && body.action !== 'submit') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.action === 'submit') updateData.status = 'SUBMITTED'

    const result = await prisma.proposal.update({
      where: { id },
      data: updateData
    })

    if (body.action === 'submit' && user.divisionId) {
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

    return NextResponse.json(result)
  } catch (error) {
    console.error('[PROPOSAL_PUT]', error)
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

    const existing = await prisma.proposal.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    if (existing.proposerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Hanya proposal berstatus DRAFT yang bisa dihapus' }, { status: 409 })
    }

    await prisma.proposal.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({ success: true, message: 'Proposal softly deleted' })
  } catch (error) {
    console.error('[PROPOSAL_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
