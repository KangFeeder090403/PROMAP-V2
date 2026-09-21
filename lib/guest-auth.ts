import { encode, getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'

// Cookie guest WAJIB beda nama dari sessionToken NextAuth (lib/auth.ts)
// supaya sesi user asli dan sesi guest tidak pernah bentrok/timpa.
export const GUEST_COOKIE_NAME = 'promap-guest-token'
const MAX_AGE_SECONDS = 2 * 60 * 60 // 2 jam

export async function signGuestToken(leadId: string, name: string) {
  return encode({
    token: { leadId, name, isGuest: true, role: 'GUEST' },
    secret: process.env.NEXTAUTH_SECRET as string,
    maxAge: MAX_AGE_SECONDS,
  })
}

export function setGuestCookie(res: NextResponse, token: string) {
  res.cookies.set(GUEST_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function getGuestToken(req: NextRequest) {
  return getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET as string,
    cookieName: GUEST_COOKIE_NAME,
  })
}
