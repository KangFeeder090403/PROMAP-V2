import { encode, getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'

// Cookie guest WAJIB beda nama dari sessionToken NextAuth (lib/auth.ts)
// supaya sesi user asli dan sesi guest tidak pernah bentrok/timpa.
// Mendukung nama standar 'guest_session' dan legacy 'promap-guest-token'
export const GUEST_COOKIE_NAME = 'guest_session'
export const LEGACY_GUEST_COOKIE_NAME = 'promap-guest-token'
const MAX_AGE_SECONDS = 2 * 60 * 60 // 2 jam

export async function signGuestToken(
  leadId: string,
  name: string,
  email?: string,
  companyName?: string
) {
  const secret = (process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET) as string
  return encode({
    token: {
      leadId,
      name,
      email: email ?? 'hendra.sobat@promap.id',
      companyName: companyName ?? 'SobatUMKM pro',
      isGuest: true,
      role: 'GUEST',
    },
    secret,
    maxAge: MAX_AGE_SECONDS,
  })
}

export function setGuestCookie(res: NextResponse, token: string) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
  }
  res.cookies.set(GUEST_COOKIE_NAME, token, cookieOptions)
  res.cookies.set(LEGACY_GUEST_COOKIE_NAME, token, cookieOptions)
}

export async function getGuestToken(req: NextRequest) {
  const secret = (process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET) as string
  const token = await getToken({
    req,
    secret,
    cookieName: GUEST_COOKIE_NAME,
  })
  if (token) return token

  return getToken({
    req,
    secret,
    cookieName: LEGACY_GUEST_COOKIE_NAME,
  })
}
