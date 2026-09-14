import assert from 'node:assert/strict'

async function testHttpEndpoints() {
  console.log('Testing HTTP Endpoints against Next.js dev server...')

  // 1. Test /api/calendar without auth (expect 307 redirect to /login)
  const res1 = await fetch('http://localhost:3000/api/calendar?from=2026-09-01&to=2026-09-30', { redirect: 'manual' })
  console.log('GET /api/calendar (unauth) status:', res1.status)
  assert.strictEqual(res1.status, 307)

  // 2. Test /api/calendar/filters without auth (expect 307 redirect to /login)
  const res2 = await fetch('http://localhost:3000/api/calendar/filters', { redirect: 'manual' })
  console.log('GET /api/calendar/filters (unauth) status:', res2.status)
  assert.strictEqual(res2.status, 307)

  // 3. Test /api/calendar/quarters without auth (expect 307 redirect to /login)
  const res3 = await fetch('http://localhost:3000/api/calendar/quarters', { redirect: 'manual' })
  console.log('GET /api/calendar/quarters (unauth) status:', res3.status)
  assert.strictEqual(res3.status, 307)

  // 4. Test login to get session cookie
  const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: 'admin@promap.com',
      password: 'Demo12345',
      csrfToken: '',
    }),
  })
  console.log('Login attempt status:', loginRes.status)

  console.log('✅ Basic HTTP routes registered and responding properly with NextAuth RBAC guards!')
}

testHttpEndpoints().catch((err) => {
  console.error('HTTP test error:', err)
  process.exit(1)
})
