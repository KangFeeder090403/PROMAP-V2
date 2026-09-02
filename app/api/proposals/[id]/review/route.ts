import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canReviewProposal } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params
    const body = await req.json()

    if (body.action !== 'APPROVE' && body.action !== 'REJECT') {
      return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 })
    }
    if (body.action === 'REJECT' && !body.reviewNote?.trim()) {
      return NextResponse.json({ error: 'reviewNote wajib diisi saat REJECT' }, { status: 400 })
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { proposer: true }
    })
    if (!proposal || proposal.deletedAt) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    if (!canReviewProposal(user, proposal, proposal.proposer.divisionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newStatus = body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

    // Cegah race condition: hanya update jika masih SUBMITTED (bukan findUnique+update terpisah)
    const result = await prisma.proposal.updateMany({
      where: { id, status: 'SUBMITTED' },
      data: { status: newStatus, reviewNote: body.reviewNote ?? null }
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Proposal sudah direview atau belum di-submit' },
        { status: 409 }
      )
    }

    await notify({
      userIds: [proposal.proposerId],
      title: newStatus === 'APPROVED' ? 'Proposal disetujui' : 'Proposal ditolak',
      message: `Proposal "${proposal.title}" telah di${newStatus === 'APPROVED' ? 'setujui' : 'tolak'}`,
      link: `/proposals/${id}`,
      companyId: proposal.proposer.companyId ?? undefined
    })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('[PROPOSAL_REVIEW]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
