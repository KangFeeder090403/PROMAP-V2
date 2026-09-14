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

/** Scope untuk query model Division (Tenant-scoped: semua role di company boleh melihat daftar divisi perusahaannya) */
export function divisionScope(user: User) {
  if (user.role === 'SUPER_ADMIN') return {}
  return { companyId: user.companyId! }
}

/** Scope generik PRD (untuk model dengan picId + divisionId + companyId) */
export function buildWhereClause(user: User) {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { companyId: user.companyId }
  if (user.role === 'MANAGER') return { divisionId: user.divisionId }
  return { picId: user.id }
}

/** Scope untuk query model Project */
export function projectScope(user: User): Record<string, unknown> {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { companyId: user.companyId! }

  if (user.role === 'MANAGER') {
    const conditions: Record<string, unknown>[] = [
      { divisionId: null },
      { tasks: { some: { divisionId: user.divisionId, deletedAt: null } } },
    ]
    if (user.divisionId) {
      conditions.unshift({ divisionId: user.divisionId })
    }
    return {
      companyId: user.companyId!,
      OR: conditions,
    }
  }

  // PIC: project yang menugaskan PIC via task, project divisinya, atau project umum lintas divisi
  const conditions: Record<string, unknown>[] = [
    { tasks: { some: { picId: user.id, deletedAt: null } } },
    { divisionId: null },
  ]
  if (user.divisionId) {
    conditions.push({ divisionId: user.divisionId })
  }
  return {
    companyId: user.companyId!,
    OR: conditions,
  }
}

/** Siapa boleh create/edit/delete Project. MANAGER hanya utk divisi sendiri. */
export function canManageProject(user: User, existingDivisionId?: string | null) {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL') return true
  if (user.role === 'MANAGER') return existingDivisionId === user.divisionId
  return false
}

/**
 * Scope untuk query model Task — CUSTOM, Task tidak punya companyId langsung
 * (harus lewat relasi division).
 */
export function taskScope(user: User) {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { division: { companyId: user.companyId! } }
  if (user.role === 'MANAGER') return { divisionId: user.divisionId }
  return { picId: user.id }
}

/** Siapa boleh assign/create Task. */
export function canAssignTask(user: User) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL' || user.role === 'MANAGER'
}

/** Siapa boleh update status Task saja (drag Kanban). PIC hanya task miliknya sendiri. */
export function canUpdateTaskStatus(user: User, task: { picId: string }) {
  return canAssignTask(user) || task.picId === user.id
}

/** Hanya Super Admin boleh kelola Lead (lintas-tenant by design). */
export function canManageLeads(user: User) {
  return user.role === 'SUPER_ADMIN'
}

/** Hanya Super Admin & Admin Ops boleh kelola user (CRUD + approve). */
export function canManageUsers(user: User) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL'
}

/**
 * Scope untuk query model Proposal — via relasi proposer (Proposal tidak
 * punya companyId/divisionId langsung).
 */
export function proposalScope(user: User) {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { proposer: { companyId: user.companyId! } }
  if (user.role === 'MANAGER') {
    if (!user.divisionId) return { proposerId: user.id }
    return { proposer: { divisionId: user.divisionId } }
  }
  return { proposerId: user.id }
}

/** Manager boleh review proposal divisi sendiri, Admin Ops & Super Admin boleh review semua (kecuali milik sendiri). */
export function canReviewProposal(
  user: User,
  proposal: { proposerId: string },
  proposerDivisionId: string | null
) {
  if (proposal.proposerId === user.id) return false
  if (user.role === 'SUPER_ADMIN') return true
  if (user.role === 'ADMIN_OPERATIONAL') return true
  if (user.role === 'MANAGER') {
    return user.divisionId !== null && user.divisionId !== undefined && user.divisionId === proposerDivisionId
  }
  return false
}

/** Hanya proposer sendiri, dan hanya selagi status DRAFT. */
export function canEditProposal(user: User, proposal: { proposerId: string; status: string }) {
  return user.id === proposal.proposerId && proposal.status === 'DRAFT'
}

/** Scope untuk query model ActionPlan. */
export function apScope(user: User) {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { companyId: user.companyId! }
  if (user.role === 'MANAGER') {
    // Guard: Manager tanpa divisi fallback ke PIC milik sendiri agar tidak
    // menghasilkan { divisionId: null } yang match semua AP personal lintas tenant.
    if (!user.divisionId) return { picId: user.id }
    return { divisionId: user.divisionId }
  }
  return { picId: user.id }
}

/** Semua role terautentikasi (kecuali GUEST, sudah ditolak di getSessionUser) boleh create AP. */
export function canCreateAP(_user: User) {
  return true
}

/** Siapa boleh reassign AP. Guard divisi Manager dicek manual di route. */
export function canReassignAP(user: User) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL' || user.role === 'MANAGER'
}

/**
 * Siapa boleh review ActionPlan (approve/reject/evidence-required).
 * - Tidak boleh review AP milik sendiri (no self-review).
 * - SUPER_ADMIN: semua.
 * - ADMIN_OPERATIONAL: AP di company sendiri — termasuk personal AP (divisionId null),
 *   ini fallback reviewer utk personal AP (keputusan bisnis implisit, PRD tidak eksplisit
 *   sebut approver personal AP — catat di komentar untuk Product Owner).
 * - MANAGER: AP divisi sendiri, divisionId WAJIB match non-null (personal AP divisionId
 *   null TIDAK PERNAH match manager manapun).
 */
export function canReviewActionPlan(
  user: User,
  ap: { picId: string; divisionId: string | null; companyId: string }
) {
  if (ap.picId === user.id) return false
  if (user.role === 'SUPER_ADMIN') return true
  if (user.role === 'ADMIN_OPERATIONAL') return ap.companyId === user.companyId
  if (user.role === 'MANAGER') return ap.divisionId !== null && ap.divisionId === user.divisionId
  return false
}

/**
 * Siapa boleh kelola Checklist AP (create/toggle/delete).
 * - Hanya PIC pemilik AP (tidak ada delegasi ke Manager).
 * - Hanya selagi status AP masih bisa dikerjakan: NOT_STARTED/IN_PROGRESS/EVIDENCE_REQUIRED.
 */
export function canManageChecklist(user: User, ap: { picId: string; status: string }) {
  if (ap.picId !== user.id) return false
  return ['NOT_STARTED', 'IN_PROGRESS', 'EVIDENCE_REQUIRED'].includes(ap.status)
}


/**
 * Siapa boleh sentuh UserLabel dan apa efeknya:
 * - SUPER_ADMIN/ADMIN_OPERATIONAL: create/edit/delete, langsung ACTIVE.
 * - MANAGER: hanya boleh usul (POST), status DIPAKSA PENDING di server —
 *   jangan pernah percaya body.status dari client manapun.
 */
export function canManageUserLabel(user: User) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL' || user.role === 'MANAGER'
}
