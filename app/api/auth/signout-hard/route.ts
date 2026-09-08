import { NextResponse } from 'next/server'

export async function POST() {
  const isProd = process.env.NODE_ENV === 'production'
  const res = NextResponse.json({ ok: true })

  for (const name of [
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
    'promap-guest-token',
  ]) {
    res.cookies.delete({ name, path: '/', secure: isProd })
  }

  return res
}
