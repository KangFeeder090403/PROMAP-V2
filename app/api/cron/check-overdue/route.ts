import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notifications'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export async function GET(req: Request) {
  // Fail-closed: CRON_SECRET wajib di-set DAN cocok. Env kosong = tolak, bukan bypass.
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // (a) Overdue — endDate lewat, status masih pengerjaan aktif awal.
    // Sesuai PRD §A4 & CLAUDE.md: hanya NOT_STARTED & IN_PROGRESS yang transisi ke OVERDUE.
    const overdue = await prisma.actionPlan.findMany({
      where: {
        endDate: { lt: now },
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
        deletedAt: null,
      },
    })

    if (overdue.length > 0) {
      await prisma.actionPlan.updateMany({
        where: { id: { in: overdue.map((ap) => ap.id) } },
        data: { status: 'OVERDUE' },
      })

      const byDivision = overdue.filter((ap) => ap.divisionId)
      const managers = byDivision.length
        ? await prisma.user.findMany({
            where: {
              role: 'MANAGER',
              divisionId: { in: byDivision.map((ap) => ap.divisionId as string) },
              deletedAt: null,
              status: 'ACTIVE',
            },
            select: { id: true, divisionId: true },
          })
        : []

      for (const ap of overdue) {
        await notify({
          userIds: [ap.picId],
          title: 'Action Plan terlambat',
          message: `"${ap.title}" sudah melewati deadline`,
          link: `/action-plans?open=${ap.id}`,
          companyId: ap.companyId,
        })
        const relatedManagers = managers.filter((m) => m.divisionId === ap.divisionId).map((m) => m.id)
        if (relatedManagers.length > 0) {
          await notify({
            userIds: relatedManagers,
            title: 'Action Plan terlambat',
            message: `"${ap.title}" sudah melewati deadline`,
            link: `/action-plans?open=${ap.id}`,
            companyId: ap.companyId,
          })
        }
      }
    }

    // (b) Deadline H-1 — endDate antara +24h dan +48h, status masih bisa dikerjakan.
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    const dueSoon = await prisma.actionPlan.findMany({
      where: {
        endDate: { gte: in24h, lte: in48h },
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
        deletedAt: null,
      },
    })

    let h1Count = 0
    const today = startOfDay(now)
    for (const ap of dueSoon) {
      const already = await prisma.notification.findFirst({
        where: {
          userId: ap.picId,
          title: 'Deadline besok',
          link: `/action-plans?open=${ap.id}`,
          createdAt: { gte: today },
        },
      })
      if (already) continue

      await notify({
        userIds: [ap.picId],
        title: 'Deadline besok',
        message: `"${ap.title}" jatuh tempo besok`,
        link: `/action-plans?open=${ap.id}`,
        companyId: ap.companyId,
      })
      h1Count++
    }

    // (c) Belum-review >3 hari — PENDING_APPROVAL, boleh notify berulang tiap hari.
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const staleReview = await prisma.actionPlan.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        updatedAt: { lt: threeDaysAgo },
        deletedAt: null,
      },
    })

    const superAdminIds = staleReview.length
      ? (
          await prisma.user.findMany({
            where: { role: 'SUPER_ADMIN', deletedAt: null, status: 'ACTIVE' },
            select: { id: true },
          })
        ).map((s) => s.id)
      : []

    for (const ap of staleReview) {
      const reviewerIds = new Set<string>()
      if (ap.divisionId) {
        const managers = await prisma.user.findMany({
          where: { role: 'MANAGER', divisionId: ap.divisionId, deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
        })
        managers.forEach((m) => reviewerIds.add(m.id))
      } else {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN_OPERATIONAL', companyId: ap.companyId, deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
        })
        admins.forEach((a) => reviewerIds.add(a.id))
      }
      superAdminIds.forEach((id) => reviewerIds.add(id))
      if (reviewerIds.size > 0) {
        await notify({
          userIds: [...reviewerIds],
          title: ap.divisionId ? 'AP belum direview >3 hari' : 'AP personal belum direview >3 hari',
          message: `"${ap.title}" masih menunggu review Anda`,
          link: `/action-plans?open=${ap.id}`,
          companyId: ap.companyId,
        })
      }
    }

    return NextResponse.json({
      overdueCount: overdue.length,
      h1Count,
      staleReviewCount: staleReview.length,
    })
  } catch (error) {
    console.error('[CRON_CHECK_OVERDUE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
