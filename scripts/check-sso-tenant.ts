// Self-check tenantAllows — gerbang validasi tenant untuk SSO Google.
// Jalankan: npx tsx scripts/check-sso-tenant.ts
import assert from 'node:assert/strict'
import { tenantAllows } from '@/lib/auth'

let n = 0
function check(desc: string, fn: () => void) {
  fn()
  n++
  console.log(`  OK ${desc}`)
}

const base = {
  deletedAt: null,
  status: 'ACTIVE' as const,
  isGuest: false,
  role: 'PIC' as const,
  company: { deletedAt: null, isActive: true },
}

check('user aktif dengan company aktif diterima', () => {
  assert.equal(tenantAllows(base), true)
})

check('user soft-deleted ditolak', () => {
  assert.equal(tenantAllows({ ...base, deletedAt: new Date(0) }), false)
})

check('user non-ACTIVE ditolak', () => {
  assert.equal(tenantAllows({ ...base, status: 'PENDING' as never }), false)
})

check('akun guest ditolak', () => {
  assert.equal(tenantAllows({ ...base, isGuest: true }), false)
})

check('company non-aktif memblokir user biasa', () => {
  assert.equal(tenantAllows({ ...base, company: { deletedAt: null, isActive: false } }), false)
})

check('company soft-deleted memblokir user biasa', () => {
  assert.equal(tenantAllows({ ...base, company: { deletedAt: new Date(0), isActive: true } }), false)
})

check('SUPER_ADMIN lolos walau company non-aktif', () => {
  assert.equal(
    tenantAllows({
      ...base,
      role: 'SUPER_ADMIN' as const,
      company: { deletedAt: new Date(0), isActive: false },
    }),
    true,
  )
})

check('user tanpa company diterima', () => {
  assert.equal(tenantAllows({ ...base, company: null }), true)
})

console.log(`\nOK — ${n} assertions passed (sso-tenant)`)
