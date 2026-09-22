import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope, canReviewActionPlan } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import type { ActionPlanStatus } from '@/lib/generated/prisma/client'

const ALLOWED_BATCH_ACTIONS = ['start', 'complete', 'review-complete'] as const
type AllowedBatchAction = (typeof ALLOWED_BATCH_ACTIONS)[number]

interface BulkTransitionBody {
  ids: string[]
  action: AllowedBatchAction
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as BulkTransitionBody
    const { ids, action } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Daftar ID Action Plan tidak boleh kosong' }, { status: 400 })
    }

    if (ids.length > 50) {
      return NextResponse.json({ error: 'Maksimal 50 item per batch request' }, { status: 400 })
    }

    if (!ALLOWED_BATCH_ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          error:
            'Aksi batch hanya mendukung transisi langsung tanpa catatan (start, complete, review-complete). Transisi dengan catatan wajib dilakukan via Drawer Detail.',
        },
        { status: 400 }
      )
    }

    // Query semua item yang diminta dengan company/division/user scope & deletedAt: null
    const existingAPs = await prisma.actionPlan.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        ...apScope(user),
      },
      select: {
        id: true,
        title: true,
        status: true,
        picId: true,
        divisionId: true,
        companyId: true,
        isPersonal: true,
        taskId: true,
      },
    })

    const apMap = new Map(existingAPs.map((ap) => [ap.id, ap]))
    const updated: string[] = []
    const failed: { id: string; reason: string }[] = []
    const toUpdate: { id: string; newStatus: ActionPlanStatus; ap: (typeof existingAPs)[0] }[] = []

    for (const id of ids) {
      const ap = apMap.get(id)
      if (!ap) {
        failed.push({ id, reason: 'Action Plan tidak ditemukan atau di luar wewenang akses' })
        continue
      }

      // Check per-item permissions & status rules
      if (action === 'start') {
        if (ap.picId !== user.id) {
          failed.push({ id, reason: 'Hanya PIC pemilik yang dapat memulai Action Plan ini' })
          continue
        }
        if (!['NOT_STARTED', 'REJECTED', 'OVERDUE'].includes(ap.status)) {
          failed.push({
            id,
            reason: `Status saat ini (${ap.status}) tidak dapat dimulai (hanya NOT_STARTED, REJECTED, OVERDUE)`,
          })
          continue
        }
        toUpdate.push({ id, newStatus: 'IN_PROGRESS', ap })
      } else if (action === 'complete') {
        if (ap.picId !== user.id) {
          failed.push({ id, reason: 'Hanya PIC pemilik yang dapat menyelesaikan Action Plan ini' })
          continue
        }
        const isPersonal = ap.isPersonal || !ap.taskId
        if (!isPersonal) {
          failed.push({ id, reason: 'Action Plan inisiatif proyek wajib melalui alur review atasan' })
          continue
        }
        if (ap.status === 'COMPLETE') {
          failed.push({ id, reason: 'Action Plan sudah berstatus Selesai' })
          continue
        }
        if (!['NOT_STARTED', 'IN_PROGRESS', 'EVIDENCE_REQUIRED', 'REJECTED', 'OVERDUE'].includes(ap.status)) {
          failed.push({ id, reason: `Status saat ini (${ap.status}) tidak valid untuk diselesaikan` })
          continue
        }
        toUpdate.push({ id, newStatus: 'COMPLETE', ap })
      } else if (action === 'review-complete') {
        if (!canReviewActionPlan(user, ap)) {
          failed.push({ id, reason: 'Anda tidak memiliki hak akses review untuk Action Plan ini' })
          continue
        }
        if (ap.status !== 'PENDING_APPROVAL') {
          failed.push({ id, reason: 'Hanya Action Plan berstatus PENDING_APPROVAL yang dapat disetujui' })
          continue
        }
        toUpdate.push({ id, newStatus: 'COMPLETE', ap })
      }
    }

    if (toUpdate.length > 0) {
      await prisma.$transaction(
        toUpdate.map(({ id, newStatus }) =>
          prisma.actionPlan.update({
            where: { id },
            data: { status: newStatus },
          })
        )
      )

      toUpdate.forEach(({ id }) => updated.push(id))

      // Trigger notifikasi jika action adalah review-complete (menyetujui AP PIC)
      if (action === 'review-complete') {
        // Group notifikasi per PIC
        const picNotifications = new Map<string, { companyId: string; titles: string[] }>()
        for (const { ap } of toUpdate) {
          if (ap.picId === user.id) continue
          const current = picNotifications.get(ap.picId) ?? { companyId: ap.companyId, titles: [] }
          current.titles.push(ap.title)
          picNotifications.set(ap.picId, current)
        }

        await Promise.allSettled(
          Array.from(picNotifications.entries()).map(([picId, info]) => {
            const count = info.titles.length
            const message =
              count === 1
                ? `"${info.titles[0]}" — AP disetujui oleh atasan.`
                : `${count} Action Plan telah disetujui oleh atasan.`
            return notify({
              userIds: [picId],
              title: 'AP disetujui',
              message,
              link: '/action-plans',
              companyId: info.companyId,
            })
          })
        )
      }
    }

    return NextResponse.json({
      updated,
      failed,
      count: updated.length,
    })
  } catch (error) {
    console.error('[ACTION_PLANS_BULK_TRANSITION]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
