import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

import {
  apScope,
  canCreateAP,
  canReviewActionPlan,
  companyScope,
  divisionScope,
  buildWhereClause,
  canManageProject,
  canAssignTask,
  canUpdateTaskStatus,
  canManageLeads,
  canManageUsers,
  canEditProposal,
  canReviewProposal,
  canManageChecklist,
  canManageUserLabel,
  requireRole,
} from '@/lib/rbac'
import type { User } from '@/lib/generated/prisma/client'

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user1@example.com',
    name: 'User One',
    phone: null,
    password: 'hashedpassword',
    role: 'PIC',
    status: 'ACTIVE',
    companyId: 'company-1',
    divisionId: 'division-1',
    supervisorId: null,
    userLabelId: null,
    isGuest: false,
    guestExpiry: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

describe('lib/rbac.ts', () => {
  describe('apScope()', () => {
    it('returns demo company id for GUEST role', () => {
      const guest = createMockUser({ role: 'GUEST', companyId: null })
      expect(apScope(guest)).toEqual({ companyId: 'demo-company-id' })

      const guestWithCompany = createMockUser({ role: 'GUEST', companyId: 'custom-company' })
      expect(apScope(guestWithCompany)).toEqual({ companyId: 'custom-company' })
    })

    it('returns empty object for SUPER_ADMIN role (global scope)', () => {
      const superAdmin = createMockUser({ role: 'SUPER_ADMIN' })
      expect(apScope(superAdmin)).toEqual({})
    })

    it('returns companyId scope for ADMIN_OPERATIONAL', () => {
      const adminOps = createMockUser({ role: 'ADMIN_OPERATIONAL', companyId: 'company-123' })
      expect(apScope(adminOps)).toEqual({ companyId: 'company-123' })
    })

    it('returns divisionId scope for MANAGER with a divisionId', () => {
      const manager = createMockUser({ role: 'MANAGER', divisionId: 'div-abc' })
      expect(apScope(manager)).toEqual({ divisionId: 'div-abc' })
    })

    it('returns picId scope for MANAGER without divisionId (fallback)', () => {
      const managerNoDiv = createMockUser({ role: 'MANAGER', id: 'mgr-1', divisionId: null })
      expect(apScope(managerNoDiv)).toEqual({ picId: 'mgr-1' })
    })

    it('returns picId scope for PIC role', () => {
      const pic = createMockUser({ role: 'PIC', id: 'pic-99' })
      expect(apScope(pic)).toEqual({ picId: 'pic-99' })
    })
  })

  describe('canCreateAP()', () => {
    it('disallows GUEST from creating Action Plan', () => {
      const guest = createMockUser({ role: 'GUEST' })
      expect(canCreateAP(guest)).toBe(false)
    })

    it('allows SUPER_ADMIN, ADMIN_OPERATIONAL, MANAGER, and PIC to create Action Plan', () => {
      expect(canCreateAP(createMockUser({ role: 'SUPER_ADMIN' }))).toBe(true)
      expect(canCreateAP(createMockUser({ role: 'ADMIN_OPERATIONAL' }))).toBe(true)
      expect(canCreateAP(createMockUser({ role: 'MANAGER' }))).toBe(true)
      expect(canCreateAP(createMockUser({ role: 'PIC' }))).toBe(true)
    })
  })

  describe('canReviewActionPlan()', () => {
    const ap = {
      picId: 'owner-1',
      divisionId: 'div-1',
      companyId: 'company-1',
    }

    it('disallows GUEST from reviewing', () => {
      const guest = createMockUser({ role: 'GUEST' })
      expect(canReviewActionPlan(guest, ap)).toBe(false)
    })

    it('disallows self-review even for SUPER_ADMIN or MANAGER', () => {
      const superAdminSelf = createMockUser({ id: 'owner-1', role: 'SUPER_ADMIN' })
      expect(canReviewActionPlan(superAdminSelf, ap)).toBe(false)

      const managerSelf = createMockUser({ id: 'owner-1', role: 'MANAGER', divisionId: 'div-1' })
      expect(canReviewActionPlan(managerSelf, ap)).toBe(false)
    })

    it('allows SUPER_ADMIN to review any AP not owned by self', () => {
      const superAdmin = createMockUser({ id: 'admin-other', role: 'SUPER_ADMIN' })
      expect(canReviewActionPlan(superAdmin, ap)).toBe(true)
    })

    it('allows ADMIN_OPERATIONAL to review AP within the same company', () => {
      const adminSameCompany = createMockUser({
        id: 'admin-ops',
        role: 'ADMIN_OPERATIONAL',
        companyId: 'company-1',
      })
      expect(canReviewActionPlan(adminSameCompany, ap)).toBe(true)

      const adminOtherCompany = createMockUser({
        id: 'admin-ops-2',
        role: 'ADMIN_OPERATIONAL',
        companyId: 'company-2',
      })
      expect(canReviewActionPlan(adminOtherCompany, ap)).toBe(false)
    })

    it('allows MANAGER to review AP matching their non-null divisionId', () => {
      const managerSameDiv = createMockUser({
        id: 'mgr-1',
        role: 'MANAGER',
        divisionId: 'div-1',
      })
      expect(canReviewActionPlan(managerSameDiv, ap)).toBe(true)

      const managerOtherDiv = createMockUser({
        id: 'mgr-2',
        role: 'MANAGER',
        divisionId: 'div-other',
      })
      expect(canReviewActionPlan(managerOtherDiv, ap)).toBe(false)

      // Personal AP (divisionId is null) should not be reviewable by Manager
      const personalAp = { ...ap, divisionId: null }
      expect(canReviewActionPlan(managerSameDiv, personalAp)).toBe(false)
    })

    it('disallows PIC from reviewing AP', () => {
      const pic = createMockUser({ id: 'pic-2', role: 'PIC' })
      expect(canReviewActionPlan(pic, ap)).toBe(false)
    })
  })

  describe('other RBAC functions', () => {
    it('companyScope returns correct filter', () => {
      expect(companyScope(createMockUser({ role: 'GUEST', companyId: null }))).toEqual({ id: 'demo-company-id' })
      expect(companyScope(createMockUser({ role: 'SUPER_ADMIN' }))).toEqual({})
      expect(companyScope(createMockUser({ role: 'ADMIN_OPERATIONAL', companyId: 'c1' }))).toEqual({ id: 'c1' })
    })

    it('divisionScope returns correct filter', () => {
      expect(divisionScope(createMockUser({ role: 'GUEST', companyId: null }))).toEqual({ companyId: 'demo-company-id' })
      expect(divisionScope(createMockUser({ role: 'SUPER_ADMIN' }))).toEqual({})
      expect(divisionScope(createMockUser({ role: 'MANAGER', companyId: 'c1' }))).toEqual({ companyId: 'c1' })
    })

    it('buildWhereClause returns correct filter per role', () => {
      expect(buildWhereClause(createMockUser({ role: 'GUEST', companyId: null }))).toEqual({ companyId: 'demo-company-id' })
      expect(buildWhereClause(createMockUser({ role: 'SUPER_ADMIN' }))).toEqual({})
      expect(buildWhereClause(createMockUser({ role: 'ADMIN_OPERATIONAL', companyId: 'c1' }))).toEqual({ companyId: 'c1' })
      expect(buildWhereClause(createMockUser({ role: 'MANAGER', divisionId: 'd1' }))).toEqual({ divisionId: 'd1' })
      expect(buildWhereClause(createMockUser({ role: 'PIC', id: 'u1' }))).toEqual({ picId: 'u1' })
    })

    it('canManageProject checks permissions properly', () => {
      expect(canManageProject(createMockUser({ role: 'GUEST' }))).toBe(false)
      expect(canManageProject(createMockUser({ role: 'SUPER_ADMIN' }))).toBe(true)
      expect(canManageProject(createMockUser({ role: 'ADMIN_OPERATIONAL' }))).toBe(true)
      expect(canManageProject(createMockUser({ role: 'MANAGER', divisionId: 'd1' }), 'd1')).toBe(true)
      expect(canManageProject(createMockUser({ role: 'MANAGER', divisionId: 'd1' }), 'd2')).toBe(false)
      expect(canManageProject(createMockUser({ role: 'PIC' }))).toBe(false)
    })

    it('canAssignTask and canUpdateTaskStatus work properly', () => {
      expect(canAssignTask(createMockUser({ role: 'GUEST' }))).toBe(false)
      expect(canAssignTask(createMockUser({ role: 'PIC' }))).toBe(false)
      expect(canAssignTask(createMockUser({ role: 'MANAGER' }))).toBe(true)

      const pic = createMockUser({ id: 'pic-1', role: 'PIC' })
      expect(canUpdateTaskStatus(pic, { picId: 'pic-1' })).toBe(true)
      expect(canUpdateTaskStatus(pic, { picId: 'pic-2' })).toBe(false)
    })

    it('canManageLeads and canManageUsers check permissions', () => {
      expect(canManageLeads(createMockUser({ role: 'SUPER_ADMIN' }))).toBe(true)
      expect(canManageLeads(createMockUser({ role: 'ADMIN_OPERATIONAL' }))).toBe(false)

      expect(canManageUsers(createMockUser({ role: 'SUPER_ADMIN' }))).toBe(true)
      expect(canManageUsers(createMockUser({ role: 'ADMIN_OPERATIONAL' }))).toBe(true)
      expect(canManageUsers(createMockUser({ role: 'MANAGER' }))).toBe(false)
    })

    it('requireRole returns 403 response if role disallowed and null if allowed', async () => {
      const guard = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL'])
      const allowedUser = createMockUser({ role: 'SUPER_ADMIN' })
      const forbiddenUser = createMockUser({ role: 'PIC' })

      expect(guard(allowedUser)).toBeNull()

      const res = guard(forbiddenUser)
      expect(res).not.toBeNull()
      expect(res?.status).toBe(403)
      const data = await res?.json()
      expect(data).toEqual({ error: 'Forbidden' })
    })

    it('canEditProposal and canReviewProposal work properly', () => {
      const proposer = createMockUser({ id: 'proposer-1', role: 'PIC' })
      expect(canEditProposal(proposer, { proposerId: 'proposer-1', status: 'DRAFT' })).toBe(true)
      expect(canEditProposal(proposer, { proposerId: 'proposer-1', status: 'SUBMITTED' })).toBe(false)
      expect(canEditProposal(proposer, { proposerId: 'other-user', status: 'DRAFT' })).toBe(false)

      expect(canReviewProposal(proposer, { proposerId: 'proposer-1' }, 'd1')).toBe(false)
      const manager = createMockUser({ id: 'mgr-1', role: 'MANAGER', divisionId: 'd1' })
      expect(canReviewProposal(manager, { proposerId: 'proposer-1' }, 'd1')).toBe(true)
      expect(canReviewProposal(manager, { proposerId: 'proposer-1' }, 'd2')).toBe(false)
    })

    it('canManageChecklist only allows owner on active statuses', () => {
      const owner = createMockUser({ id: 'owner-1', role: 'PIC' })
      const other = createMockUser({ id: 'other-1', role: 'PIC' })

      expect(canManageChecklist(owner, { picId: 'owner-1', status: 'NOT_STARTED' })).toBe(true)
      expect(canManageChecklist(owner, { picId: 'owner-1', status: 'IN_PROGRESS' })).toBe(true)
      expect(canManageChecklist(owner, { picId: 'owner-1', status: 'EVIDENCE_REQUIRED' })).toBe(true)
      expect(canManageChecklist(owner, { picId: 'owner-1', status: 'COMPLETE' })).toBe(false)
      expect(canManageChecklist(other, { picId: 'owner-1', status: 'IN_PROGRESS' })).toBe(false)
    })

    it('canManageUserLabel only allows managers and admins', () => {
      expect(canManageUserLabel(createMockUser({ role: 'GUEST' }))).toBe(false)
      expect(canManageUserLabel(createMockUser({ role: 'PIC' }))).toBe(false)
      expect(canManageUserLabel(createMockUser({ role: 'MANAGER' }))).toBe(true)
      expect(canManageUserLabel(createMockUser({ role: 'ADMIN_OPERATIONAL' }))).toBe(true)
      expect(canManageUserLabel(createMockUser({ role: 'SUPER_ADMIN' }))).toBe(true)
    })
  })
})
