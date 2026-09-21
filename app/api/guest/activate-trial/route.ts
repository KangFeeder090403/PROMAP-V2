import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notifications'
import { getGuestToken } from '@/lib/guest-auth'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const token = await getGuestToken(req)
    if (!token?.leadId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: token.leadId as string } })
    if (!lead || lead.status === 'CONVERTED') {
      return NextResponse.json({ error: 'Lead tidak valid' }, { status: 400 })
    }

    const now = new Date()
    const trialEndAt = new Date(now.getTime() + THIRTY_DAYS_MS)

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'TRIAL_ACTIVE', trialStartAt: now, trialEndAt },
    })

    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    })
    await notify({
      userIds: superAdmins.map((u) => u.id),
      title: 'Leads aktivasi trial',
      message: `${lead.name} dari ${lead.companyName} mengaktifkan trial 30 hari`,
      link: '/settings/leads',
    })

    return NextResponse.json({ trialEndAt: trialEndAt.toISOString() })
  } catch (error) {
    console.error('[GUEST_ACTIVATE_TRIAL]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
