import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { PUBLIC_PAGES, PUBLIC_PREFIX } from '@/lib/auth-redirect'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public pages — exact match
  if ((PUBLIC_PAGES as readonly string[]).includes(pathname)) {
    return NextResponse.next()
  }

  // Public API prefixes — startsWith
  if (PUBLIC_PREFIX.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Static files & Next.js internals — lewat
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  // Cek JWT dari httpOnly cookie
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    // Root path — tampilkan landing page, bukan form login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/landing', req.url))
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
