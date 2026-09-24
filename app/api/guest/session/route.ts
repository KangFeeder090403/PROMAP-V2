import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGuestToken } from '@/lib/guest-auth'

export async function GET(req: NextRequest) {
  const token = await getGuestToken(req)

  const headers = { 'Cache-Control': 'no-store' }

  if (!token) {
    return NextResponse.json({ active: false, exp: null, user: null }, { headers })
  }

  // token.exp is seconds since epoch (JWT standard)
  const exp = typeof token.exp === 'number' ? token.exp * 1000 : null
  const active = exp ? Date.now() < exp : false

  return NextResponse.json(
    {
      active,
      exp,
      leadId: (token.leadId as string) ?? null,
      name: (token.name as string) ?? 'Hendra Wijaya',
      email: (token.email as string) ?? 'hendra.sobat@promap.id',
      role: 'GUEST',
      company: (token.companyName as string) ?? 'SobatUMKM pro',
      division: 'IT Operasional',
    },
    { headers }
  )
}
