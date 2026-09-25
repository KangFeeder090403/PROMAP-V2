import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { PUBLIC_PAGES, PUBLIC_PREFIX } from '@/lib/auth-redirect'
import { getGuestToken, GUEST_COOKIE_NAME, LEGACY_GUEST_COOKIE_NAME } from '@/lib/guest-auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Static files & Next.js internals — lewat
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  const token = await getToken({ req, secret })
  const guestToken = await getGuestToken(req)

  // User terautentikasi DB (SUPER_ADMIN, ADMIN_OPERATIONAL, MANAGER, PIC).
  // Sesi riil WAJIB mengabaikan cookie guest jika ada.
  const hasRealUserSession = Boolean(token?.uid) && token?.role !== 'GUEST' && !token?.isGuest

  const isGuest =
    !hasRealUserSession &&
    (token?.role === 'GUEST' ||
      Boolean(token?.isGuest) ||
      Boolean(guestToken?.isGuest) ||
      guestToken?.role === 'GUEST')

  // Sesi sah = token yang membawa uid (cuid user di DB / id demo guest) ATAU memiliki guestToken aktif.
  const authed = Boolean(token?.uid) || Boolean(guestToken)

  // Rute root '/'
  if (pathname === '/') {
    if (authed) {
      const res = NextResponse.redirect(new URL('/dashboard', req.url))
      if (hasRealUserSession) {
        res.cookies.set(GUEST_COOKIE_NAME, '', { maxAge: 0, path: '/' })
        res.cookies.set(LEGACY_GUEST_COOKIE_NAME, '', { maxAge: 0, path: '/' })
      }
      return res
    }
    return NextResponse.rewrite(new URL('/landing', req.url))
  }

  // Halaman login
  if (pathname === '/login') {
    const hasGuestCookie = req.cookies.has(GUEST_COOKIE_NAME) || req.cookies.has(LEGACY_GUEST_COOKIE_NAME)
    const isSignout = req.nextUrl.searchParams.has('signout') || req.nextUrl.searchParams.has('error')

    // Jika ada sinyal signout / error / atau ada cookie demo guest saat membuka login perusahaan,
    // bersihkan cookie guest agar tidak tertimpa ke akun login.
    if (isSignout || hasGuestCookie) {
      const res = NextResponse.next()
      if (isSignout) {
        res.cookies.set('next-auth.session-token', '', { maxAge: 0, path: '/' })
        res.cookies.set('__Secure-next-auth.session-token', '', { maxAge: 0, path: '/' })
      }
      res.cookies.set(GUEST_COOKIE_NAME, '', { maxAge: 0, path: '/' })
      res.cookies.set(LEGACY_GUEST_COOKIE_NAME, '', { maxAge: 0, path: '/' })
      return res
    }

    // User yang benar-benar aktif login (bukan guest) tidak perlu akses halaman auth
    if (authed && !isGuest) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Public pages — exact match atau turunan rute demo
  if ((PUBLIC_PAGES as readonly string[]).includes(pathname) || pathname.startsWith('/demo')) {
    return NextResponse.next()
  }

  // Public API prefixes — startsWith
  if (PUBLIC_PREFIX.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Proteksi rute privat untuk pengunjung tanpa sesi
  if (!authed) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Aturan otorisasi rute untuk role GUEST:
  // - Guest BOLEH akses /dashboard, /, /board, /calendar (view-only, data dummy)
  // - Guest DILARANG akses /settings, /projects, /action-plans (dialihkan ke dashboard dengan CTA trial)
  // - Guest TIDAK BOLEH di-redirect ke / atau /login saat akses /dashboard
  if (isGuest) {
    const isForbidden =
      pathname.startsWith('/settings') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/action-plans')

    if (isForbidden) {
      const dashboardUrl = new URL('/dashboard', req.url)
      dashboardUrl.searchParams.set('trial', '1')
      return NextResponse.redirect(dashboardUrl)
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
