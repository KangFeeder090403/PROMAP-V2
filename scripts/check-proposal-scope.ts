// Self-check proposalScope — assert-based, tanpa framework. Jalankan: npx tsx scripts/check-proposal-scope.ts
import assert from 'node:assert/strict'
import { proposalScope } from '@/lib/rbac'
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

assert.deepStrictEqual(proposalScope(superAdmin), {})
assert.deepStrictEqual(proposalScope(adminOps), { proposer: { companyId: 'company-1' } })
assert.deepStrictEqual(proposalScope(manager), { proposer: { divisionId: 'division-1' } })
assert.deepStrictEqual(proposalScope(pic), { proposerId: 'u-pic' })

console.log('OK — 4 assertions passed (proposalScope)')
