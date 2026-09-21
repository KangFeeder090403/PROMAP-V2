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

  // jwt callback mengembalikan { ...token, uid: null } saat tenant ditolak (lib/auth.ts).
  // Sesi sah = token yang membawa uid (cuid user di DB).
  // JANGAN gunakan token.email / token.sub karena token OAuth Google dari akun
  // non-aktif / belum terdaftar tetap memiliki email dan sub, yang bisa memicu
  // bouncing loop 307 jika diloloskan oleh middleware ke layout dashboard.
  const authed = Boolean(token?.uid)

  // Rute root '/'
  if (pathname === '/') {
    if (authed) return NextResponse.next()
    return NextResponse.rewrite(new URL('/landing', req.url))
  }

  // Halaman login
  if (pathname === '/login') {
    // Jika ada sinyal signout / sesi berakhir / error auth, bersihkan cookie sesi
    // di response header agar sesi stale tidak mengunci browser.
    if (req.nextUrl.searchParams.has('signout') || req.nextUrl.searchParams.has('error')) {
      const res = NextResponse.next()
      res.cookies.set('next-auth.session-token', '', { maxAge: 0, path: '/' })
      res.cookies.set('__Secure-next-auth.session-token', '', { maxAge: 0, path: '/' })
      return res
    }

    // User yang benar-benar aktif login tidak perlu akses halaman auth
    if (authed) {
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
  if (!authed) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
