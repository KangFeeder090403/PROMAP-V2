import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope } from '@/lib/rbac'
import {
  buildMentionRejectionMessage,
  extractMentionIds,
  resolveMentionsForAp,
} from '@/lib/mentions'
import { COMMENT_MAX_LENGTH } from '@/lib/mention-parse'
import { addedMentionIds, isWithinEditWindow } from '@/lib/comment-edit'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'

// PATCH saja. TIDAK ADA DELETE — komentar permanen (audit trail).

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; commentId: string } }
) {
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
      where: { id: params.id, deletedAt: null, ...apScope(user) },
      select: { id: true, companyId: true, divisionId: true, title: true, picId: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Filter actionPlanId mencegah edit komentar AP lain lewat id tebakan:
    // tanpa itu, cuid komentar yang bocor bisa disunting dari AP manapun yang
    // kebetulan lolos apScope() penyerang.
    const comment = await prisma.comment.findFirst({
      where: { id: params.commentId, actionPlanId: ap.id },
      select: {
        id: true,
        actionPlanId: true,
        authorId: true,
        content: true,
        createdAt: true,
        editedAt: true,
        author: { select: { id: true, name: true } },
      },
    })
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Kepemilikan SAJA. SUPER_ADMIN pun tidak boleh menyunting tulisan orang
    // lain — audit trail kehilangan artinya kalau atasan bisa menulis ulang
    // kalimat bawahannya. 403 (bukan 404) tidak membocorkan apapun: yang sampai
    // baris ini sudah lolos apScope + actionPlanId, jadi dia memang berhak
    // membaca komentar itu lewat GET.
    if (comment.authorId !== user.id) {
      return NextResponse.json(
        { error: 'Hanya penulis komentar yang bisa menyuntingnya' },
        { status: 403 }
      )
    }

    // Jendela ditegakkan di SERVER. Gating tombol di client hanya kenyamanan;
    // drawer yang terbuka berjam-jam atau request manual tetap tertahan di sini.
    if (!isWithinEditWindow(comment.createdAt, new Date())) {
      return NextResponse.json(
        {
          error:
            'Jendela edit 15 menit sudah lewat. Komentar ini permanen — kirim komentar baru sebagai koreksi.',
        },
        { status: 409 }
      )
    }

    // No-op: konten identik. Tidak menulis editedAt (jangan tandai "(diedit)"
    // untuk komentar yang tidak berubah) dan tidak mencatat ActivityLog.
    // Bentuk respons SAMA dengan jalur sukses — client tidak boleh melihat dua
    // bentuk dari satu endpoint.
    if (content === comment.content) {
      return NextResponse.json({
        comment,
        mentionNames: await mentionNameMap(content, ap.companyId),
      })
    }

    // Delta: oldIds dibaca dari DB, BUKAN dari body request — kalau dari body,
    // penyerang tinggal mengaku mention lama untuk melewati validasi.
    const oldIds = extractMentionIds(comment.content)
    const newIds = extractMentionIds(content)
    const addedIds = addedMentionIds(oldIds, newIds)

    const { valid: addedValid, rejectedIds } = await resolveMentionsForAp(addedIds, ap)
    if (rejectedIds.length > 0) {
      return NextResponse.json(
        { error: await buildMentionRejectionMessage(rejectedIds, ap.companyId), rejectedIds },
        { status: 400 }
      )
    }

    const updated = await prisma.comment.update({
      where: { id: comment.id },
      data: { content, editedAt: new Date() },
      include: { author: { select: { id: true, name: true } } },
    })

    // INI yang menjaga audit trail: teks asli tidak hilang, ia pindah ke oldValue.
    await logActivity({
      userId: user.id,
      actionPlanId: ap.id,
      action: 'COMMENT_EDITED',
      oldValue: comment.content.slice(0, 200),
      newValue: content.slice(0, 200),
    })

    // Hanya mention BARU yang dinotifikasi. Mention lama tidak dikirimi notif
    // ulang setiap kali penulis memperbaiki typo. PIC juga tidak — komentarnya
    // bukan komentar baru, dia sudah diberitahu saat POST.
    const notifyIds = addedValid.map((m) => m.id).filter((id) => id !== user.id)
    if (notifyIds.length > 0) {
      await notify({
        userIds: notifyIds,
        title: 'Anda di-mention',
        message: `${user.name} menyebut Anda di komentar "${ap.title}"`,
        link: `/action-plans?open=${ap.id}`,
        companyId: ap.companyId,
      })
    }

    return NextResponse.json({
      comment: updated,
      mentionNames: await mentionNameMap(content, ap.companyId),
    })
  } catch (error) {
    console.error('[AP_COMMENT_PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * Nama untuk SELURUH mention di konten final, bukan hanya yang baru — kalau
 * hanya yang baru, mention lama berubah jadi "pengguna tidak dikenal" di layar
 * begitu disimpan. Pola query sama dengan GET (comments/route.ts:33-38).
 */
async function mentionNameMap(content: string, companyId: string) {
  const ids = extractMentionIds(content)
  if (ids.length === 0) return {}
  const users = await prisma.user.findMany({
    where: { id: { in: ids }, companyId, deletedAt: null },
    select: { id: true, name: true },
  })
  return Object.fromEntries(users.map((u) => [u.id, u.name]))
}
