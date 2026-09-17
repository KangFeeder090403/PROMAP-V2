import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { PUBLIC_PAGES, PUBLIC_PREFIX } from '@/lib/auth-redirect'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Static files & Next.js internals — lewat
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isAuthenticated = Boolean(token && (token.uid || token.id || token.email || token.sub))

  // Rute root '/'
  if (pathname === '/') {
    if (isAuthenticated) return NextResponse.next()
    return NextResponse.rewrite(new URL('/landing', req.url))
  }

  // Halaman login
  if (pathname === '/login') {
    // Jika ada sinyal signout / sesi berakhir, hapus cookie sesi dan tampilkan login form
    if (req.nextUrl.searchParams.has('signout') || req.nextUrl.searchParams.has('error')) {
      const res = NextResponse.next()
      res.cookies.set('next-auth.session-token', '', { maxAge: 0, path: '/' })
      res.cookies.set('__Secure-next-auth.session-token', '', { maxAge: 0, path: '/' })
      return res
    }
    // User yang benar-benar aktif login tidak perlu akses halaman auth
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  // Public pages — exact match
  if ((PUBLIC_PAGES as readonly string[]).includes(pathname)) {
    return NextResponse.next()
  }

  // Public API prefixes — startsWith
  if (PUBLIC_PREFIX.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Proteksi rute privat lainnya
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
