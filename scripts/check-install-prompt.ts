// Self-check jadwal popup install — jalankan: npx tsx scripts/check-install-prompt.ts
import assert from 'node:assert/strict'
import { canShowInstallPrompt, WEEK_MS } from '../lib/install-prompt'

const now = 1_800_000_000_000
const base = { now, lastShown: null as number | null, installed: false, mode: 'android' as const }

assert.equal(canShowInstallPrompt(base), true, 'belum pernah tampil → tampil')
assert.equal(canShowInstallPrompt({ ...base, lastShown: now - WEEK_MS + 1 }), false, '< 7 hari → jeda')
assert.equal(canShowInstallPrompt({ ...base, lastShown: now - WEEK_MS }), true, 'tepat 7 hari → tampil')
assert.equal(canShowInstallPrompt({ ...base, installed: true }), false, 'sudah install → tidak')
assert.equal(canShowInstallPrompt({ ...base, mode: null }), false, 'tanpa BIP & bukan iOS → tidak')
assert.equal(canShowInstallPrompt({ ...base, mode: 'ios', lastShown: now - 8 * 86_400_000 }), true, 'iOS > 7 hari → tampil')
assert.equal(canShowInstallPrompt({ ...base, lastShown: now + 3_600_000 }), true, 'jam mundur → tidak terkunci')
assert.equal(canShowInstallPrompt({ ...base, lastShown: Number.NaN }), true, 'nilai rusak → anggap belum')
console.log('check-install-prompt: OK (8 assert)')