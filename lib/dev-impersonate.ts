import { encode, getToken } from 'next-auth/jwt'
import { getServerSession } from 'next-auth'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// =====================================================================
// FEATURE TESTING DEV-ONLY: switch account (impersonasi) untuk verifikasi
// POV tiap role (Super Admin / Admin Operasional / Manager / PIC).
//
// Cara kerja: sesi NextAuth adalah JWT terenkripsi di httpOnly cookie.
// Helper ini DECODE token, timpa claim identitas -> user target (rolinya
// otomatis ikut karena seluruh RBAC dibangun di atas getSessionUser),
// lalu ENCODE ulang dengan secret yang sama dan tulis balik ke cookie.
// "Kembali ke akun asli" memulihkan snapshot yang disimpan saat switch.
//
// PENGAMAN (dua lapis, keduanya harus lolos):
//   1. NODE_ENV !== 'production'
//   2. VERCEL tidak diset — mematikan fitur di SEMUA deployment Vercel,
//      termasuk preview. Preview build ber-NODE_ENV 'production' pada
//      umumnya, tapi jangan bergantung pada itu: preview punya URL publik,
//      dan endpoint ini menempa cookie sesi. Jadi: local dev saja.
// Ini ALAT TESTING SEMENTARA — hapus folder app/api/dev/*, komponen
// DevAccountSwitcher, dan lib/dev-impersonate.ts setelah pemakaian.
// =====================================================================

export const DEV_IMPERSONATE_ENABLED =
  process.env.NODE_ENV !== 'production' && !process.env.VERCEL

function cookieParams() {
  const prod = process.env.NODE_ENV === 'production'
  return {
    name: prod ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
    secure: prod,
  }
}

interface Claims {
  sub?: string | null
  uid?: string | null
  role?: string | null
  status?: string | null
  companyId?: string | null
  divisionId?: string | null
  isGuest?: boolean | null
  email?: string | null
  name?: string | null
  impersonatorSnapshot?: Partial<Claims> | null
}

async function readToken(req: NextRequest): Promise<Claims | null> {
  const { name, secure } = cookieParams()
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!secret) return null
  const token = await getToken({
    req,
    secret,
    cookieName: name,
    secureCookie: secure,
  })
  return (token ?? null) as Claims | null
}

async function writeToken(req: NextRequest, token: Claims): Promise<NextResponse | null> {
  const { name, secure } = cookieParams()
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!secret) return null
  const value = await encode({ token: token as never, secret })
  const res = NextResponse.json({
    ok: true,
    user: { id: token.uid, name: token.name, email: token.email, role: token.role },
    impersonating: Boolean(token.impersonatorSnapshot),
  })
  res.cookies.set({
    name,
    value,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}

/** Switch sesi aktif ke akun target. Null jika nonaktif/target tidak valid. */
export async function devImpersonate(req: NextRequest, targetUserId: string) {
  if (!DEV_IMPERSONATE_ENABLED) return null
  if (!targetUserId) return null

  const target = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!target || target.deletedAt || target.status !== 'ACTIVE') return null
  if (!target.companyId && !['SUPER_ADMIN', 'ADMIN_OPERATIONAL'].includes(target.role)) {
    return null
  }

  const token = await readToken(req)
  if (!token) return null

  // Cegah Guest / Demo switch ke akun manapun
  if (
    token.role === 'GUEST' ||
    token.isGuest ||
    token.uid === 'guest-hendra-wijaya' ||
    token.uid?.startsWith('guest-')
  ) {
    return null
  }

  // Snapshot identitas asli (diambil SEKALI, tidak ditimpa) supaya
  // "kembali ke akun asli" selalu restore ke actor awal.
  if (!token.impersonatorSnapshot) {
    token.impersonatorSnapshot = {
      sub: token.sub,
      uid: token.uid,
      role: token.role,
      status: token.status,
      companyId: token.companyId,
      divisionId: token.divisionId,
      isGuest: token.isGuest,
      email: token.email,
      name: token.name,
    }
  }

  token.sub = target.id
  token.uid = target.id
  token.role = target.role
  token.status = target.status
  token.companyId = target.companyId
  token.divisionId = target.divisionId
  token.isGuest = target.isGuest
  token.email = target.email
  token.name = target.name

  return writeToken(req, token)
}

/** Kembalikan sesi ke akun asli (hapus impersonasi). */
export async function devStopImpersonate(req: NextRequest) {
  if (!DEV_IMPERSONATE_ENABLED) return null

  const token = await readToken(req)
  if (!token) return null

  if (
    token.role === 'GUEST' ||
    token.isGuest ||
    token.uid === 'guest-hendra-wijaya' ||
    token.uid?.startsWith('guest-')
  ) {
    return null
  }

  const snap = token.impersonatorSnapshot
  if (!snap) {
    const res = NextResponse.json({ ok: true, impersonating: false })
    return res
  }

  token.sub = snap.sub ?? null
  token.uid = snap.uid ?? null
  token.role = snap.role ?? null
  token.status = snap.status ?? null
  token.companyId = snap.companyId ?? null
  token.divisionId = snap.divisionId ?? null
  token.isGuest = Boolean(snap.isGuest)
  token.email = snap.email ?? null
  token.name = snap.name ?? null
  token.impersonatorSnapshot = null

  return writeToken(req, token)
}

/** Daftar akun aktif untuk dipilih — dev-only, jangan dipakai di production. */
export async function devListAccounts() {
  if (!DEV_IMPERSONATE_ENABLED) return []

  const users = await prisma.user.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      division: { select: { name: true } },
      company: { select: { name: true } },
    },
    take: 300,
  })

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    divisionName: u.division?.name ?? null,
    companyName: u.company?.name ?? null,
  }))
}

/** Flag untuk UI: apakah sesi saat ini sedang impersonasi (dev-only). */
export async function devGetImpersonationFlag() {
  if (!DEV_IMPERSONATE_ENABLED) return false
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role === 'GUEST' || session.user.isGuest) {
    return false
  }
  return Boolean(session?.user?.isImpersonating)
}