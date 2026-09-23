/**
 * Self-check edgeScrollVelocity — tanpa framework.
 * Jalankan: npx tsx scripts/check-edge-scroll.ts
 */
import assert from 'node:assert/strict'
import { edgeScrollVelocity as v } from '../lib/edge-scroll'

const H = 800

assert.equal(v(400, H), 0, 'tengah viewport tidak boleh scroll')
assert.ok(v(10, H) < 0, 'dekat tepi atas scroll ke atas')
assert.ok(v(790, H) > 0, 'dekat tepi bawah scroll ke bawah')
assert.ok(Math.abs(v(0, H)) > Math.abs(v(90, H)), 'makin dekat tepi makin cepat')
assert.equal(v(96, H), 0, 'tepat di batas zona = diam')
assert.ok(Math.abs(v(0, H)) <= 18, 'kecepatan terbatas')

// zone lebih besar dari setengah viewport — zona atas & bawah tidak boleh
// tumpang tindih dan hasilnya tidak boleh NaN
const SHORT = 120
for (const y of [0, 30, 60, 90, 120]) {
  const out = v(y, SHORT, 200)
  assert.ok(Number.isFinite(out), `zone > viewport/2 menghasilkan NaN di y=${y}`)
  assert.ok(Math.abs(out) <= 18, `kecepatan tidak terbatas di y=${y}`)
}
assert.equal(v(60, SHORT, 200), 0, 'titik tengah viewport pendek tetap diam')
assert.ok(v(0, SHORT, 200) < 0, 'viewport pendek: tepi atas tetap scroll ke atas')
assert.ok(v(120, SHORT, 200) > 0, 'viewport pendek: tepi bawah tetap scroll ke bawah')

// input tidak masuk akal
assert.equal(v(NaN, H), 0, 'clientY NaN aman')
assert.equal(v(400, 0), 0, 'viewport 0 aman')
assert.equal(v(400, H, 0), 0, 'zone 0 aman')

console.log('edge-scroll OK')
