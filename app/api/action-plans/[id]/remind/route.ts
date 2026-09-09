import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canReviewActionPlan } from '@/lib/rbac'
import { notify } from '@/lib/notifications'

/** Hanya AP yang benar-benar butuh tindakan PIC yang boleh diingatkan. */
const REMINDABLE = ['OVERDUE', 'EVIDENCE_REQUIRED']

/** Satu pengingat per AP per 24 jam — anti-spam, sumber kebenaran di ActivityLog. */
const REMINDER_ACTION = 'REMINDER_SENT'
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const existing = await prisma.actionPlan.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Action Plan not found' }, { status: 404 })
    }

    // canReviewActionPlan sekaligus menolak self-remind (ap.picId === user.id).
    if (!canReviewActionPlan(user, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!REMINDABLE.includes(existing.status)) {
      return NextResponse.json(
        { error: 'Pengingat hanya untuk AP yang lewat tenggat atau butuh bukti' },
        { status: 409 }
      )
    }

    const recent = await prisma.activityLog.findFirst({
      where: {
        actionPlanId: id,
        action: REMINDER_ACTION,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_MS) },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (recent) {
      return NextResponse.json(
        {
          error: 'Pengingat untuk AP ini sudah dikirim dalam 24 jam terakhir',
          lastSentAt: recent.createdAt.toISOString(),
        },
        { status: 429 }
      )
    }

    // Log dulu, baru notify. Kalau notify gagal, rate-limit tetap berlaku —
    // itu perilaku yang benar untuk anti-spam.
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        actionPlanId: id,
        action: REMINDER_ACTION,
        newValue: existing.status,
      },
    })

    await notify({
      userIds: [existing.picId],
      title: 'Tenggat Terlewat: Rencana Aksi Memerlukan Tindakan',
      message: `Rencana aksi "${existing.title}" telah melewati batas waktu. Harap segera memperbarui status atau berikan evaluasi kendala.`,
      // Halaman detail AP belum ada (roadmap UI-6) — pakai query param, bukan /action-plans/${id}.
      link: `/action-plans?id=${id}`,
      companyId: existing.companyId,
    })

    return NextResponse.json({ ok: true, picId: existing.picId })
  } catch (error) {
    console.error('[ACTION_PLAN_REMIND]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
