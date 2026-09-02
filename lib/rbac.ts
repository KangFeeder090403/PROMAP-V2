import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { User, Role } from '@/lib/generated/prisma/client'

/**
 * Ambil user dari sesi — tolak jika null, inactive, guest, atau deleted.
 * Pakai di SEMUA API route sebagai baris pertama.
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) return null
  if (user.deletedAt) return null
  if (user.status !== 'ACTIVE') return null
  if (user.isGuest) return null
  if (user.role === 'GUEST') return null

  // Non-SUPER_ADMIN wajib punya companyId
  if (user.role !== 'SUPER_ADMIN' && !user.companyId) return null

  return user
}

/**
 * Guard role — lempar 403 jika user tidak punya salah satu role yang diizinkan.
 */
export function requireRole(allowedRoles: Role[]) {
  return (user: User) => {
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null // berarti lolos
  }
}

// ─── Scope per resource ────────────────────────────────────────
// buildWhereClause generik PRD tidak cocok untuk semua model —
// Company tidak punya picId/divisionId, Division tidak punya picId.
// companyScope/divisionScope di bawah menggantikan untuk model tsb.
// buildWhereClause tetap tersedia untuk model yang punya semua FK
// (ActionPlan, Task, dll — dipakai mulai roadmap #6+).
// ───────────────────────────────────────────────────────────────

/** Scope untuk query model Company */
export function companyScope(user: User) {
  if (user.role === 'SUPER_ADMIN') return {}
  return { id: user.companyId! }
}

/** Scope untuk query model Division */
export function divisionScope(user: User) {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { companyId: user.companyId! }
  // MANAGER + PIC boleh lihat divisi sendiri saja
  if (user.divisionId) return { id: user.divisionId }
  // divisionId null → kembalikan empty result (bukan error)
  return { id: '__none__' }
}

/** Scope generik PRD (untuk model dengan picId + divisionId + companyId) */
export function buildWhereClause(user: User) {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { companyId: user.companyId }
  if (user.role === 'MANAGER') return { divisionId: user.divisionId }
  return { picId: user.id }
}
