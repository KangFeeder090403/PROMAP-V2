import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
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

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
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
        // Company di-soft-delete → seluruh usernya ikut terkunci.
        if (user.company && (user.company.deletedAt || !user.company.isActive)) return null

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
  ],
  callbacks: {
    async jwt({ token, user }) {
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
