import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { shortRef } from '@/lib/dashboard-aggregate'
import type { MyWorkApiResponse, MyWorkItem } from '@/lib/types/my-work'

export const dynamic = 'force-dynamic'

/**
 * My Work — PIC Personal Console.
 *
 * Scope SELURUH role dipaksa `picId: user.id` (kerjaan yang ditugaskan ke user
 * ini), sesuai semantik "My Work" — dashboard/board tetap jadi tempat konteks
 * tim/divisi. Hidupkan di /api/my-work, muncul juga di nav check + seed check.
 */
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const actionPlans = await prisma.actionPlan.findMany({
      where: { picId: user.id, deletedAt: null },
      include: {
        task: {
          select: {
            title: true,
            project: { select: { name: true } },
          },
        },
        checklists: { select: { isDone: true } },
      },
      orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
    })

    // Proposal DRAFT = butuh aksi "submit". SUBMITTED/dll. tetap tampil di /proposals.
    const proposals = await prisma.proposal.findMany({
      where: { proposerId: user.id, deletedAt: null, status: 'DRAFT' },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    const proposalItems = proposals.map((p) => ({
      id: p.id,
      refCode: shortRef(p.id, 'PR'),
      title: p.title,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }))

    // Nama reviewer untuk AP yang menunggu review: Manager aktif per divisi.
    // AP personal (divisionId null) tidak punya reviewer tertanam → null (pill tanpa nama).
    const pendingDivisionIds = [
      ...new Set(
        actionPlans
          .filter((ap) => ap.status === 'PENDING_APPROVAL' && ap.divisionId)
          .map((ap) => ap.divisionId) as string[]
      ),
    ]

    const managers = pendingDivisionIds.length
      ? await prisma.user.findMany({
          where: {
            role: 'MANAGER',
            status: 'ACTIVE',
            deletedAt: null,
            divisionId: { in: pendingDivisionIds },
          },
          select: { divisionId: true, name: true },
        })
      : []

    const reviewerByDivision = new Map(managers.map((m) => [m.divisionId, m.name]))

    const userDetail = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        company: { select: { name: true } },
        division: { select: { name: true } },
      },
    })

    const items: MyWorkItem[] = actionPlans.map((ap) => ({
      id: ap.id,
      refCode: shortRef(ap.id, 'AP'),
      title: ap.title,
      status: ap.status,
      priority: ap.priority,
      endDate: ap.endDate.toISOString(),
      updatedAt: ap.updatedAt.toISOString(),
      reviewNote: ap.reviewNote,
      checklistTotal: ap.checklists.length,
      checklistDone: ap.checklists.filter((c) => c.isDone).length,
      taskTitle: ap.task?.title ?? null,
      projectName: ap.task?.project?.name ?? null,
      reviewerName:
        ap.status === 'PENDING_APPROVAL'
          ? ap.divisionId
            ? (reviewerByDivision.get(ap.divisionId) ?? null)
            : null
          : null,
    }))

    const response: MyWorkApiResponse = {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        companyName: userDetail?.company?.name ?? null,
        divisionName: userDetail?.division?.name ?? null,
      },
      actionPlans: items,
      proposals: proposalItems,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[MY_WORK_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}