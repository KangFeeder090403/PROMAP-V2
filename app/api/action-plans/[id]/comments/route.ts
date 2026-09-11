import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope } from '@/lib/rbac'
import { extractMentionIds, resolveMentions } from '@/lib/mentions'
import { notify } from '@/lib/notifications'

// Comment tidak bisa dihapus/diedit — hanya GET (list thread) & POST (tambah).

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ap = await prisma.actionPlan.findFirst({
      where: { id: params.id, deletedAt: null, ...apScope(user) },
      select: { id: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const comments = await prisma.comment.findMany({
      where: { actionPlanId: ap.id },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    })

    return NextResponse.json(comments)
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
    const content = body.content?.trim()
    if (!content) {
      return NextResponse.json({ error: 'content wajib diisi' }, { status: 400 })
    }

    const ap = await prisma.actionPlan.findFirst({
      where: { id: params.id, deletedAt: null, ...apScope(user) },
      select: { id: true, companyId: true, title: true, picId: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const comment = await prisma.comment.create({
      data: { actionPlanId: ap.id, authorId: user.id, content },
      include: { author: { select: { id: true, name: true } } },
    })

    const mentionIds = extractMentionIds(content)
    let notifiedUserIds = new Set<string>()

    if (mentionIds.length > 0) {
      const mentioned = await resolveMentions(mentionIds, ap.companyId)
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

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('[AP_COMMENTS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
