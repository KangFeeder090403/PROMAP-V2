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

  // jwt callback mengembalikan {} saat tenant ditolak (lib/auth.ts). Objek kosong
  // itu masih truthy, jadi cek keberadaan token saja meloloskan sesi mati:
  // middleware meneruskan ke '/', layout dashboard menolaknya karena
  // getSessionUser() null, lalu redirect balik ke '/login' — loop 307 tak henti.
  // Sesi sah = token yang membawa uid, definisi yang sama dipakai getSessionUser().
  const authed = Boolean(token?.uid)

  // Rute root '/'
  if (pathname === '/') {
    if (authed) return NextResponse.next()
    return NextResponse.rewrite(new URL('/landing', req.url))
  }

  // User sudah login tidak perlu akses halaman auth.
  // Kecuali '?signout=1': itu datang dari layout dashboard yang baru saja menolak
  // sesi ini (mis. user kehilangan companyId atau dinonaktifkan setelah token
  // terbit). Melempar balik ke '/' akan memantul ke sini lagi — loop 307.
  if (authed && pathname === '/login' && req.nextUrl.searchParams.get('signout') !== '1') {
    return NextResponse.redirect(new URL('/', req.url))
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
