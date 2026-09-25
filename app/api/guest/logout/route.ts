import { NextResponse } from 'next/server'
import { GUEST_COOKIE_NAME, LEGACY_GUEST_COOKIE_NAME } from '@/lib/guest-auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(GUEST_COOKIE_NAME, '', { maxAge: 0, path: '/' })
  res.cookies.set(LEGACY_GUEST_COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return res
}
