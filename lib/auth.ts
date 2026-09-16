import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { Role, UserStatus } from '@/lib/generated/prisma/client'

// Claim tambahan yang dititipkan ke JWT. Dipakai handler GET agar tidak
// query User tiap request. Handler MUTASI wajib re-fetch dari DB —
// token lama tetap sah setelah user dinonaktifkan/diturunkan role.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      status: UserStatus
      companyId: string | null
      divisionId: string | null
      isGuest: boolean
      // Dev-only: true kalau sesi sedang impersonasi akun lain (fitur testing
      // /api/dev/impersonate, NONAKTIF di production).
      isImpersonating: boolean
    }
  }
}

/**
 * SSO Google aktif hanya kalau kedua env terisi. Halaman login membaca flag yang
 * sama lewat server component supaya tombol tidak dirender saat provider mati —
 * kalau dirender, klik-nya berujung 404 di /api/auth/signin/google.
 */
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
)

/**
 * Validasi tenant untuk user yang sudah di-lookup dari DB.
 * Cerminan aturan authorize() credentials — dipakai ulang oleh jalur Google.
 */
export function tenantAllows(user: {
  deletedAt: Date | null
  status: UserStatus
  isGuest: boolean
  role: Role
  company: { deletedAt: Date | null; isActive: boolean } | null
}): boolean {
  if (user.deletedAt) return false
  if (user.status !== 'ACTIVE') return false
  // Akun guest cuma boleh lewat jalur demo, bukan SSO.
  if (user.isGuest) return false
  if (user.role !== 'SUPER_ADMIN' && user.company && (user.company.deletedAt || !user.company.isActive)) {
    return false
  }
  return true
}

const SSO_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  companyId: true,
  divisionId: true,
  isGuest: true,
  deletedAt: true,
  company: { select: { deletedAt: true, isActive: true } },
} as const

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  // error diarahkan balik ke /login?error=... supaya pesan tampil dalam bahasa
  // Indonesia di panel login, bukan halaman bawaan NextAuth.
  pages: { signIn: '/login', error: '/login' },
  // JWT di httpOnly cookie — bukan localStorage (PRD: Larangan Keras).
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { company: { select: { deletedAt: true, isActive: true } } },
        })

        // Pesan gagal disamakan supaya tidak membocorkan email mana yang terdaftar.
        if (!user?.password) return null
        if (user.deletedAt) return null
        if (user.status !== 'ACTIVE') return null
        // Company di-soft-delete → seluruh usernya ikut terkunci (kecuali SUPER_ADMIN yang scope-nya cross-tenant).
        if (user.role !== 'SUPER_ADMIN' && user.company && (user.company.deletedAt || !user.company.isActive)) return null

        const ok = await bcrypt.compare(credentials.password, user.password)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          companyId: user.companyId,
          divisionId: user.divisionId,
          isGuest: user.isGuest,
        } as never
      },
    }),
    // Tanpa PrismaAdapter — schema tidak punya model Account/Session/VerificationToken,
    // dan strategy tetap 'jwt'. Google hanya dipakai untuk membuktikan kepemilikan email;
    // seluruh claim diambil dari record User yang sudah ada (tidak ada auto-register).
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            authorization: { params: { prompt: 'select_account' } },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true

      // Email belum terverifikasi Google = jalur account takeover. Tolak.
      const g = profile as { email?: string; email_verified?: boolean } | undefined
      if (!g?.email || g.email_verified !== true) return false

      const user = await prisma.user.findUnique({
        where: { email: g.email.toLowerCase().trim() },
        select: SSO_SELECT,
      })

      // Tidak ada auto-register: akun wajib sudah dibuat Admin Operasional.
      if (!user) return false
      return tenantAllows(user)
    },
    async jwt({ token, user, account }) {
      // OAuth: `user.id` adalah id akun Google, bukan cuid DB. Wajib lookup ulang
      // supaya token.uid valid untuk getSessionUser() dan scope tenant tidak bocor.
      if (account?.provider === 'google' && token.email) {
        const db = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase().trim() },
          select: SSO_SELECT,
        })
        if (!db || !tenantAllows(db)) return {}
        token.uid = db.id
        token.role = db.role
        token.status = db.status
        token.companyId = db.companyId
        token.divisionId = db.divisionId
        token.isGuest = db.isGuest
        return token
      }

      if (user) {
        const u = user as unknown as {
          id: string
          role: Role
          status: UserStatus
          companyId: string | null
          divisionId: string | null
          isGuest: boolean
        }
        token.uid = u.id
        token.role = u.role
        token.status = u.status
        token.companyId = u.companyId
        token.divisionId = u.divisionId
        token.isGuest = u.isGuest
      }
      return token
    },
    async session({ session, token }) {
      const claims = token as unknown as {
        uid?: string | null
        role?: Role | null
        status?: UserStatus | null
        companyId?: string | null
        divisionId?: string | null
        isGuest?: boolean | null
        impersonatorSnapshot?: unknown
      }
      session.user = {
        id: (claims.uid as string) ?? '',
        email: session.user?.email ?? '',
        name: session.user?.name ?? '',
        role: (claims.role as Role) ?? 'GUEST',
        status: (claims.status as UserStatus) ?? 'ACTIVE',
        companyId: (claims.companyId as string | null) ?? null,
        divisionId: (claims.divisionId as string | null) ?? null,
        isGuest: Boolean(claims.isGuest),
        // Fitur testing dev-only; snapshot terisi saat impersonasi aktif.
        isImpersonating: Boolean(claims.impersonatorSnapshot),
      }
      return session
    },
  },
}
