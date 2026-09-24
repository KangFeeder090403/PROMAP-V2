// Self-check auth-redirect — assert-based, tanpa framework.
// Jalankan: npx tsx scripts/check-auth-redirect.ts
import assert from 'node:assert/strict'
import { safeCallbackUrl, PUBLIC_PAGES, PUBLIC_PREFIX } from '@/lib/auth-redirect'

let n = 0
function check(desc: string, fn: () => void) {
  fn()
  n++
  console.log(`  ✓ ${desc}`)
}

// --- safeCallbackUrl ---

check('returns /dashboard for valid path', () => {
  assert.equal(safeCallbackUrl('/dashboard'), '/dashboard')
})

check('returns / for null', () => {
  assert.equal(safeCallbackUrl(null), '/')
})

check('returns / for empty string', () => {
  assert.equal(safeCallbackUrl(''), '/')
})

check('rejects protocol-relative //evil.com', () => {
  assert.equal(safeCallbackUrl('//evil.com'), '/')
})

check('rejects absolute https://evil.com', () => {
  assert.equal(safeCallbackUrl('https://evil.com'), '/')
})

check('rejects /\\evil.com', () => {
  assert.equal(safeCallbackUrl('/\\evil.com'), '/')
})

check('accepts /projects/abc', () => {
  assert.equal(safeCallbackUrl('/projects/abc'), '/projects/abc')
})

check('rejects no leading slash', () => {
  assert.equal(safeCallbackUrl('dashboard'), '/')
})

// --- PUBLIC_PAGES ---

check('PUBLIC_PAGES contains exactly /login, /demo, /landing', () => {
  assert.deepEqual([...PUBLIC_PAGES], ['/login', '/demo', '/landing'])
})

// --- PUBLIC_PREFIX ---

check('PUBLIC_PREFIX contains exactly /api/auth/, /api/guest/, /api/cron/', () => {
  assert.deepEqual([...PUBLIC_PREFIX], ['/api/auth/', '/api/guest/', '/api/cron/'])
})

check('PUBLIC_PREFIX entries end with slash', () => {
  for (const p of PUBLIC_PREFIX) {
    assert.ok(p.endsWith('/'), `"${p}" must end with /`)
  }
})

console.log(`\nOK — ${n} assertions passed (auth-redirect)`)
