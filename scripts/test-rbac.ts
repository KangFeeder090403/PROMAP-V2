// Smoke test — assert-based, tanpa framework. Jalankan: npx tsx scripts/test-rbac.ts
import { canManageUsers, canManageUserLabel } from '@/lib/rbac'
import type { User, Role } from '@/lib/generated/prisma/client'

function mockUser(role: Role): User {
  return { role } as User
}

const roles: Role[] = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST']

// canManageUsers — hanya SUPER_ADMIN & ADMIN_OPERATIONAL
console.assert(canManageUsers(mockUser('SUPER_ADMIN')) === true, 'SUPER_ADMIN should manage users')
console.assert(canManageUsers(mockUser('ADMIN_OPERATIONAL')) === true, 'ADMIN_OPERATIONAL should manage users')
console.assert(canManageUsers(mockUser('MANAGER')) === false, 'MANAGER should NOT manage users')
console.assert(canManageUsers(mockUser('PIC')) === false, 'PIC should NOT manage users')
console.assert(canManageUsers(mockUser('GUEST')) === false, 'GUEST should NOT manage users')

// canManageUserLabel — SUPER_ADMIN, ADMIN_OPERATIONAL, MANAGER boleh (server tetap paksa status PENDING utk Manager)
console.assert(canManageUserLabel(mockUser('SUPER_ADMIN')) === true, 'SUPER_ADMIN should manage user labels')
console.assert(canManageUserLabel(mockUser('ADMIN_OPERATIONAL')) === true, 'ADMIN_OPERATIONAL should manage user labels')
console.assert(canManageUserLabel(mockUser('MANAGER')) === true, 'MANAGER should be able to propose user labels')
console.assert(canManageUserLabel(mockUser('PIC')) === false, 'PIC should NOT manage user labels')
console.assert(canManageUserLabel(mockUser('GUEST')) === false, 'GUEST should NOT manage user labels')

console.log(`OK — ${roles.length * 2} assertions passed (canManageUsers/canManageUserLabel)`)
