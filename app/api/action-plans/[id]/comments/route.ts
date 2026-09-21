import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope } from '@/lib/rbac'
import {
  buildMentionRejectionMessage,
  extractMentionIds,
  resolveMentionsForAp,
} from '@/lib/mentions'
import { COMMENT_MAX_LENGTH } from '@/lib/mention-parse'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'

// Komentar tidak bisa dihapus (audit trail). Route ini GET (list thread) & POST
// (tambah); edit dalam jendela 15 menit ada di [commentId]/route.ts (PATCH).

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ap = await prisma.actionPlan.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
        ...(user.role === 'SUPER_ADMIN'
          ? {}
          : user.role === 'ADMIN_OPERATIONAL'
            ? { companyId: user.companyId! }
            : user.role === 'MANAGER'
              ? (user.divisionId ? { divisionId: user.divisionId } : { picId: user.id })
              : {
                  OR: [
                    { picId: user.id },
                    ...(user.divisionId ? [{ divisionId: user.divisionId }] : []),
                  ],
                }),
      },
      select: { id: true, companyId: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const comments = await prisma.comment.findMany({
      where: { actionPlanId: ap.id },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    })

    // K4 — nama untuk highlight mention. Model Comment TIDAK punya relasi
    // mentions (prisma/schema.prisma:282-295, tidak ada tabel Mention), jadi
    // nama diambil lewat SATU query ter-batch untuk union id seluruh thread.
    // Query per komentar (N+1) dilarang.
    const mentionIds = [...new Set(comments.flatMap((c) => extractMentionIds(c.content)))]
    const mentionedUsers = mentionIds.length
      ? await prisma.user.findMany({
          where: { id: { in: mentionIds }, companyId: ap.companyId, deletedAt: null },
          select: { id: true, name: true },
        })
      : []

    return NextResponse.json({
      comments,
      mentionNames: Object.fromEntries(mentionedUsers.map((u) => [u.id, u.name])),
    })
  } catch (error) {
    console.error('[AP_COMMENTS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content) {
      return NextResponse.json({ error: 'Komentar tidak boleh kosong' }, { status: 400 })
    }
    if (content.length > COMMENT_MAX_LENGTH) {
      return NextResponse.json(
        {
          error: `Komentar terlalu panjang: ${content.length} karakter, batas ${COMMENT_MAX_LENGTH}. Persingkat lalu kirim ulang.`,
        },
        { status: 400 }
      )
    }

    const ap = await prisma.actionPlan.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
        ...(user.role === 'SUPER_ADMIN'
          ? {}
          : user.role === 'ADMIN_OPERATIONAL'
            ? { companyId: user.companyId! }
            : user.role === 'MANAGER'
              ? (user.divisionId ? { divisionId: user.divisionId } : { picId: user.id })
              : {
                  OR: [
                    { picId: user.id },
                    ...(user.divisionId ? [{ divisionId: user.divisionId }] : []),
                  ],
                }),
      },
      select: { id: true, companyId: true, divisionId: true, title: true, picId: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Validasi mention SEBELUM create — komentar dengan mention tidak sah tidak
    // boleh masuk audit trail yang tidak bisa dihapus/diedit.
    const mentionIds = extractMentionIds(content)
    const { valid: mentioned, rejectedIds } = await resolveMentionsForAp(mentionIds, ap)

    if (rejectedIds.length > 0) {
      // K8 — sebut siapa yang ditolak. User menulis panjang; "Bad request"
      // membuat kerjanya hilang tanpa penjelasan.
      return NextResponse.json(
        {
          error: await buildMentionRejectionMessage(rejectedIds, ap.companyId),
          rejectedIds,
        },
        { status: 400 }
      )
    }

    const comment = await prisma.comment.create({
      data: { actionPlanId: ap.id, authorId: user.id, content },
      include: { author: { select: { id: true, name: true } } },
    })

    await logActivity({
      userId: user.id,
      actionPlanId: ap.id,
      action: 'COMMENT_ADDED',
      newValue: content.slice(0, 200),
    })

    const notifiedUserIds = new Set<string>()
    const notifyIds = mentioned.map((m) => m.id).filter((id) => id !== user.id)
    if (notifyIds.length > 0) {
      notifyIds.forEach((id) => notifiedUserIds.add(id))
      await notify({
        userIds: notifyIds,
        title: 'Anda di-mention',
        message: `${user.name} menyebut Anda di komentar "${ap.title}"`,
        link: `/action-plans?open=${ap.id}`,
        companyId: ap.companyId,
      })
    }

    // Beritahu PIC jika ada komentar baru (jika bukan PIC sendiri dan belum di-notify via mention)
    if (ap.picId !== user.id && !notifiedUserIds.has(ap.picId)) {
      await notify({
        userIds: [ap.picId],
        title: 'Komentar baru pada AP Anda',
        message: `${user.name} berkomentar pada "${ap.title}": "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
        link: `/action-plans?open=${ap.id}`,
        companyId: ap.companyId,
      })
    }

    return NextResponse.json(
      {
        comment,
        mentionNames: Object.fromEntries(mentioned.map((m) => [m.id, m.name])),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[AP_COMMENTS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
