import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canManageProject } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import {
  createProjectWithTasks,
  linkProposalToProject,
  ConflictError,
  ProjectInputError,
} from '@/lib/projects'
import type { Priority, User } from '@/lib/generated/prisma/client'

type ConvertableProposal = {
  id: string
  title: string
  description: string
  proposerId: string
  projectId: string | null
  proposer: { companyId: string | null; divisionId: string | null }
}

/**
 * Konversi Proposal → Project. Tidak punya aturan tenant sendiri:
 * seluruh resolve company/divisi, validasi PIC, dan guard lintas divisi
 * dijalankan createProjectWithTasks() supaya tidak ada aturan kembar.
 */
async function convertToProject(
  user: User,
  proposal: ConvertableProposal,
  body: Record<string, unknown>
) {
  // MANAGER selalu create di divisinya sendiri — cermin POST /api/projects.
  if (!canManageProject(user, user.divisionId)) {
    return NextResponse.json(
      { error: 'Anda tidak memiliki izin untuk membuat Project' },
      { status: 403 }
    )
  }

  // Cek cepat untuk pesan yang enak dibaca. Penjamin sesungguhnya = updateMany di bawah.
  if (proposal.projectId) {
    return NextResponse.json(
      { error: 'Proposal ini sudah dikonversi menjadi Project' },
      { status: 409 }
    )
  }

  // Non SUPER_ADMIN: companyId dari klien diabaikan total, helper pakai user.companyId.
  const companyId = user.role === 'SUPER_ADMIN' ? (body.companyId as string | undefined) : undefined

  try {
    const { project, pics } = await prisma.$transaction(async (tx) => {
      const created = await createProjectWithTasks(tx, user, {
        // Tanpa fallback ke proposal.title: name kosong wajib jatuh ke guard 400
        // di helper, bukan diam-diam ditambal. UI mengisi lewat prefill ProjectForm.
        name: body.name as string,
        description:
          typeof body.description === 'string' ? body.description : proposal.description,
        companyId: companyId ?? null,
        divisionId: (body.divisionId as string | null | undefined) ?? null,
        startDate: body.startDate ? new Date(body.startDate as string) : null,
        endDate: body.endDate ? new Date(body.endDate as string) : null,
        picIds: body.picIds as string[] | undefined,
      })

      await linkProposalToProject(tx, proposal.id, created.project.id)

      return created
    })

    await logActivity({
      userId: user.id,
      projectId: project.id,
      actionPlanId: null,
      action: 'CREATED',
      oldValue: `Proposal:${proposal.id}@${proposal.proposer.companyId ?? 'none'}`,
      newValue: `Project:${project.id}:${project.name}@${project.companyId}`,
    })

    const picIdsNotified = pics.map((p) => p.id).filter((id) => id !== user.id)
    if (picIdsNotified.length > 0) {
      await notify({
        userIds: picIdsNotified,
        title: 'Ditugaskan ke Project Baru',
        message: `Kamu ditugaskan ke project "${project.name}" hasil konversi usulan "${proposal.title}".`,
        link: `/projects/${project.id}`,
        companyId: project.companyId,
      })
    }

    if (proposal.proposerId !== user.id && !pics.some((p) => p.id === proposal.proposerId)) {
      await notify({
        userIds: [proposal.proposerId],
        title: 'Usulan Anda telah diwujudkan menjadi Project',
        message: `Usulan "${proposal.title}" kini menjadi project "${project.name}".`,
        link: `/projects/${project.id}`,
        companyId: project.companyId,
      })
    }

    // Manager divisi tujuan selain divisi konverter perlu tahu ada kerja masuk.
    const targetDivisionIds = [
      ...new Set(pics.map((p) => p.divisionId).filter((d): d is string => Boolean(d))),
    ].filter((d) => d !== user.divisionId)

    if (targetDivisionIds.length > 0) {
      const managers = await prisma.user.findMany({
        where: {
          role: 'MANAGER',
          divisionId: { in: targetDivisionIds },
          companyId: project.companyId,
          status: 'ACTIVE',
          deletedAt: null,
          id: { not: user.id },
        },
        select: { id: true },
      })
      if (managers.length > 0) {
        await notify({
          userIds: managers.map((m) => m.id),
          title: 'Divisi Anda terlibat di Project baru',
          message: `Project "${project.name}" melibatkan anggota divisi Anda.`,
          link: `/projects/${project.id}`,
          companyId: project.companyId,
        })
      }
    }

    return NextResponse.json({ success: true, project }, { status: 201 })
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof ProjectInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PROPOSAL_CONVERT_PROJECT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    // Tanpa target eksplisit tetap Action Plan — backward compatible.
    if (body.target === 'PROJECT') {
      return convertToProject(user, proposal, body)
    }

    const title = (body.title || proposal.title).trim()
    const outcomeKpi = (body.outcomeKpi || proposal.description).trim()
    const priority = (body.priority ?? 'MEDIUM') as Priority
    const startDate = body.startDate ? new Date(body.startDate) : new Date()
    const endDate = body.endDate
      ? new Date(body.endDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
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
