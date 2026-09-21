// Self-check taskScope — assert-based, tanpa framework. Jalankan: npx tsx scripts/check-task-scope.ts
import assert from 'node:assert/strict'
import { taskScope } from '@/lib/rbac'
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

assert.deepStrictEqual(taskScope(superAdmin), {})
assert.deepStrictEqual(taskScope(adminOps), { division: { companyId: 'company-1' } })
assert.deepStrictEqual(taskScope(manager), { divisionId: 'division-1' })
assert.deepStrictEqual(taskScope(pic), { picId: 'u-pic' })

console.log('OK — 4 assertions passed (taskScope)')
