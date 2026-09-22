import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/**
 * Jumlah item My Work yang butuh aksi user — dipakai badge sidebar.
 * Route terpisah dari /api/my-work supaya sidebar tidak menarik payload penuh
 * di setiap halaman. Definisi "butuh aksi" harus sama dengan AKSI_STATUSES
 * di components/my-work/MyWorkClient.tsx.
 */
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [aps, proposals] = await Promise.all([
      prisma.actionPlan.count({
        where: {
          picId: user.id,
          deletedAt: null,
          status: { in: ['REJECTED', 'EVIDENCE_REQUIRED', 'OVERDUE'] },
        },
      }),
      prisma.proposal.count({
        where: { proposerId: user.id, deletedAt: null, status: 'DRAFT' },
      }),
    ])

    return NextResponse.json({ count: aps + proposals })
  } catch (error) {
    console.error('[API_ERROR]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
