// Self-check canReviewActionPlan + STATUS_TRANSITIONS — assert-based, tanpa framework.
// Jalankan: npx tsx scripts/check-ap-review-scope.ts
import assert from 'node:assert/strict'
import { canReviewActionPlan } from '@/lib/rbac'
import { STATUS_TRANSITIONS } from '@/lib/action-plan-status'
import type { User, ActionPlanStatus } from '@/lib/generated/prisma/client'

function mockUser(overrides: Partial<User>): User {
  return { id: 'user-1', companyId: 'c1', divisionId: 'd1', ...overrides } as User
}

// Personal AP (divisionId null) direview Admin Ops
assert.strictEqual(
  canReviewActionPlan(mockUser({ id: 'u-admin', role: 'ADMIN_OPERATIONAL', companyId: 'c1' }), {
    picId: 'x', divisionId: null, companyId: 'c1',
  }),
  true
)

// Personal AP TIDAK PERNAH direview Manager manapun
assert.strictEqual(
  canReviewActionPlan(mockUser({ id: 'u-mgr', role: 'MANAGER', divisionId: 'd1' }), {
    picId: 'x', divisionId: null, companyId: 'c1',
  }),
  false
)

// AP tim, divisi cocok -> Manager boleh
assert.strictEqual(
  canReviewActionPlan(mockUser({ id: 'u-mgr', role: 'MANAGER', divisionId: 'd1' }), {
    picId: 'x', divisionId: 'd1', companyId: 'c1',
  }),
  true
)

// No self-review, bahkan Super Admin
assert.strictEqual(
  canReviewActionPlan(mockUser({ id: 'u1', role: 'SUPER_ADMIN' }), {
    picId: 'u1', divisionId: null, companyId: 'c1',
  }),
  false
)

// Semua 8 status ada di STATUS_TRANSITIONS
const ALL_STATUSES: ActionPlanStatus[] = [
  'NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'EVIDENCE_REQUIRED',
  'APPROVED', 'REJECTED', 'OVERDUE', 'COMPLETE',
]
for (const s of ALL_STATUSES) {
  assert.ok(s in STATUS_TRANSITIONS, `missing status ${s}`)
}

// PENDING_APPROVAL tidak boleh punya edge ke APPROVED (harus COMPLETE langsung)
assert.ok(!STATUS_TRANSITIONS.PENDING_APPROVAL.includes('APPROVED'))
assert.ok(STATUS_TRANSITIONS.PENDING_APPROVAL.includes('COMPLETE'))

console.log('OK — canReviewActionPlan + STATUS_TRANSITIONS assertions passed')
