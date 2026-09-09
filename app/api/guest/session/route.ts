import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGuestToken } from '@/lib/guest-auth'

export async function GET(req: NextRequest) {
  const token = await getGuestToken(req)

  const headers = { 'Cache-Control': 'no-store' }

  if (!token) {
    return NextResponse.json({ active: false, exp: null }, { headers })
  }

  // token.exp is seconds since epoch (JWT standard)
  const exp = typeof token.exp === 'number' ? token.exp * 1000 : null
  const active = exp ? Date.now() < exp : false

  return NextResponse.json({ active, exp }, { headers })
}
