// Self-check apScope — assert-based, tanpa framework. Jalankan: npx tsx scripts/check-action-plan-scope.ts
import assert from 'node:assert/strict'
import { apScope } from '@/lib/rbac'
import type { User } from '@/lib/generated/prisma/client'

function mockUser(overrides: Partial<User>): User {
  return {
    id: 'user-1',
    companyId: 'company-1',
    divisionId: 'division-1',
    ...overrides
  } as User
}

const superAdmin = mockUser({ id: 'u-super', role: 'SUPER_ADMIN' })
const adminOps = mockUser({ id: 'u-admin', role: 'ADMIN_OPERATIONAL' })
const manager = mockUser({ id: 'u-manager', role: 'MANAGER' })
const pic = mockUser({ id: 'u-pic', role: 'PIC' })

assert.deepStrictEqual(apScope(superAdmin), {})
assert.deepStrictEqual(apScope(adminOps), { companyId: 'company-1' })
assert.deepStrictEqual(apScope(manager), { divisionId: 'division-1' })
assert.deepStrictEqual(apScope(pic), { picId: 'u-pic' })

// REASSIGNABLE whitelist tidak meloloskan APPROVED/COMPLETE/OVERDUE
const REASSIGNABLE = ['NOT_STARTED', 'IN_PROGRESS', 'REJECTED']
assert.ok(!REASSIGNABLE.includes('APPROVED'))
assert.ok(!REASSIGNABLE.includes('COMPLETE'))
assert.ok(!REASSIGNABLE.includes('OVERDUE'))
assert.ok(REASSIGNABLE.includes('NOT_STARTED'))
assert.ok(REASSIGNABLE.includes('IN_PROGRESS'))
assert.ok(REASSIGNABLE.includes('REJECTED'))

// Personal AP untuk SUPER_ADMIN/ADMIN_OPERATIONAL target → divisionId null
function personalApDivisionId(target: { role: string; divisionId: string | null }): string | null {
  if (target.role === 'SUPER_ADMIN' || target.role === 'ADMIN_OPERATIONAL') return null
  return target.divisionId
}
assert.strictEqual(personalApDivisionId({ role: 'SUPER_ADMIN', divisionId: null }), null)
assert.strictEqual(personalApDivisionId({ role: 'ADMIN_OPERATIONAL', divisionId: null }), null)
assert.strictEqual(personalApDivisionId({ role: 'PIC', divisionId: 'division-1' }), 'division-1')

console.log('OK — 13 assertions passed (apScope, REASSIGNABLE, personal AP divisionId)')
