import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notifications'
import { signGuestToken, setGuestCookie } from '@/lib/guest-auth'

const MAX_LOGIN_PER_DAY = 3
const TWO_HOURS_MS = 2 * 60 * 60 * 1000

// Key hari pembanding pakai timezone Jakarta (bukan UTC) — reset jam 00:00 WIB.
function jakartaDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, phone, companyName } = body ?? {}

    if (!name || !email || !phone || !companyName) {
      return NextResponse.json(
        { error: 'name, email, phone, companyName wajib diisi' },
        { status: 400 }
      )
    }

    const now = new Date()
    const todayKey = jakartaDateKey(now)
    const normalizedEmail = String(email).toLowerCase().trim()

    const existing = await prisma.lead.findFirst({
      where: { email: normalizedEmail },
      orderBy: { createdAt: 'desc' },
    })

    let lead
    if (!existing) {
      lead = await prisma.lead.create({
        data: {
          name,
          email: normalizedEmail,
          phone,
          companyName,
          loginCount: 1,
          lastLoginAt: now,
        },
      })
    } else {
      const lastLoginKey = existing.lastLoginAt ? jakartaDateKey(existing.lastLoginAt) : null
      const sameDay = lastLoginKey === todayKey

      if (sameDay && existing.loginCount >= MAX_LOGIN_PER_DAY) {
        return NextResponse.json(
          { error: 'Batas login guest 3x per hari tercapai. Coba lagi besok.' },
          { status: 429 }
        )
      }

      lead = await prisma.lead.update({
        where: { id: existing.id },
        data: {
          loginCount: sameDay ? existing.loginCount + 1 : 1,
          lastLoginAt: now,
        },
      })
    }

    const token = await signGuestToken(lead.id, lead.name)

    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    })
    await notify({
      userIds: superAdmins.map((u) => u.id),
      title: 'Prospek baru masuk',
      message: `${lead.name} dari ${lead.companyName} mendaftar sebagai guest`,
      link: '/settings/leads',
    })

    const res = NextResponse.json({
      leadId: lead.id,
      expiresAt: new Date(now.getTime() + TWO_HOURS_MS).toISOString(),
    })
    setGuestCookie(res, token)
    return res
  } catch (error) {
    console.error('[GUEST_REGISTER]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
