import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope } from '@/lib/rbac'
import { findMentionableUsers } from '@/lib/mentions'

/**
 * Daftar user yang boleh di-mention pada satu Action Plan.
 *
 * Sengaja TIDAK memakai /api/users: endpoint itu mengembalikan user PENDING,
 * INACTIVE, dan GUEST, sehingga dropdown menawarkan orang yang mention-nya
 * pasti ditolak server (gagal diam-diam: komentar terkirim, nol notifikasi).
 * Endpoint ini memakai predikat yang sama persis dengan validasi POST komentar.
 */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
      select: { companyId: true, divisionId: true, picId: true },
    })
    if (!ap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const users = await findMentionableUsers(ap)
    return NextResponse.json(users)
  } catch (error) {
    console.error('[AP_MENTIONABLE_USERS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
