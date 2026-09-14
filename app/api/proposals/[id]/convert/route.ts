import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import type { Priority } from '@/lib/generated/prisma/client'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        proposer: {
          select: {
            id: true,
            name: true,
            role: true,
            companyId: true,
            divisionId: true,
            deletedAt: true,
          },
        },
      },
    })

    if (!proposal || proposal.deletedAt) {
      return NextResponse.json({ error: 'Proposal tidak ditemukan' }, { status: 404 })
    }

    if (proposal.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Hanya proposal yang telah disetujui yang dapat dikonversi ke Action Plan' },
        { status: 400 }
      )
    }

    // Otorisasi: Super Admin, Admin Ops di company yang sama, Manager di divisi yang sama,
    // atau pengusul proposal itu sendiri.
    const isSuperAdmin = user.role === 'SUPER_ADMIN'
    const isAdminOps =
      user.role === 'ADMIN_OPERATIONAL' && user.companyId === proposal.proposer.companyId
    const isManager =
      user.role === 'MANAGER' &&
      user.divisionId !== null &&
      user.divisionId === proposal.proposer.divisionId
    const isProposer = user.id === proposal.proposerId

    if (!isSuperAdmin && !isAdminOps && !isManager && !isProposer) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki izin untuk mengonversi proposal ini' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))

    const title = (body.title || proposal.title).trim()
    const outcomeKpi = (body.outcomeKpi || proposal.description).trim()
    const priority = (body.priority ?? 'MEDIUM') as Priority
    const startDate = body.startDate ? new Date(body.startDate) : new Date()
    const endDate = body.endDate
      ? new Date(body.endDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 })
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Tanggal mulai tidak boleh lebih lambat dari tanggal target selesai' },
        { status: 400 }
      )
    }

    const targetPicId = body.picId ?? proposal.proposerId
    const targetPic = await prisma.user.findUnique({
      where: { id: targetPicId },
      select: { id: true, name: true, divisionId: true, companyId: true, deletedAt: true },
    })

    if (!targetPic || targetPic.deletedAt) {
      return NextResponse.json({ error: 'PIC yang dipilih tidak valid' }, { status: 400 })
    }

    let isPersonal = true
    let taskId: string | null = null
    let divisionId = targetPic.divisionId ?? proposal.proposer.divisionId
    let companyId = targetPic.companyId ?? proposal.proposer.companyId ?? user.companyId

    if (body.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: body.taskId },
        include: { division: true },
      })
      if (!task || task.deletedAt) {
        return NextResponse.json({ error: 'Task induk tidak ditemukan' }, { status: 404 })
      }
      isPersonal = false
      taskId = task.id
      divisionId = task.divisionId
      companyId = task.division.companyId
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'Perusahaan (Company) tidak dapat ditentukan untuk Action Plan ini' },
        { status: 400 }
      )
    }

    // Buat Action Plan baru
    const actionPlan = await prisma.actionPlan.create({
      data: {
        title,
        outcomeKpi,
        priority,
        startDate,
        endDate,
        taskId,
        picId: targetPic.id,
        companyId,
        divisionId,
        isPersonal,
        status: 'NOT_STARTED',
      },
      include: {
        pic: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
      },
    })

    // Catat log aktivitas
    await logActivity({
      userId: user.id,
      actionPlanId: actionPlan.id,
      action: 'STATUS_CHANGED',
      oldValue: null,
      newValue: 'NOT_STARTED',
    })

    // Kirim notifikasi in-app
    if (targetPic.id !== user.id) {
      await notify({
        userIds: [targetPic.id],
        title: 'Usulan dijadikan Action Plan',
        message: `Usulan "${proposal.title}" telah disetujui dan ditugaskan sebagai Action Plan: "${actionPlan.title}"`,
        link: `/action-plans?open=${actionPlan.id}`,
        companyId,
      })
    }

    if (proposal.proposerId !== user.id && proposal.proposerId !== targetPic.id) {
      await notify({
        userIds: [proposal.proposerId],
        title: 'Usulan Anda telah dikonversi',
        message: `Usulan "${proposal.title}" telah dijadikan Action Plan oleh ${user.name}`,
        link: `/action-plans?open=${actionPlan.id}`,
        companyId,
      })
    }

    return NextResponse.json({ success: true, actionPlan }, { status: 201 })
  } catch (error) {
    console.error('[PROPOSAL_CONVERT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
