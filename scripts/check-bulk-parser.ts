// Self-check bulk parser — assert-based, tanpa framework, tanpa DB/env.
// Jalankan: npx tsx scripts/check-bulk-parser.ts
import assert from 'node:assert/strict'
import { parseBulkActionPlans, type BulkParserDefaults } from '@/lib/bulk-parser'

let n = 0
function check(desc: string, fn: () => void) {
  try {
    fn()
  } catch (e) {
    console.error(`FAIL — ${desc}`)
    throw e
  }
  n++
}

const D: BulkParserDefaults = { priority: 'MEDIUM', days: 7, status: 'NOT_STARTED' }
const one = (text: string, d: BulkParserDefaults = D) => parseBulkActionPlans(text, d)[0]

function daysFromNow(d: Date): number {
  const a = new Date()
  a.setHours(0, 0, 0, 0)
  const b = new Date(d)
  b.setHours(0, 0, 0, 0)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

// 1. Status dari token "dimulai" harus menang atas default COMPLETE — bukti hasil parsing.
check('1. dimulai dikenali walau default COMPLETE', () => {
  const r = one('buat mie, high, 1 hari, dimulai', { priority: 'MEDIUM', days: 7, status: 'COMPLETE' })
  assert.equal(r.title, 'buat mie')
  assert.equal(r.priority, 'HIGH')
  assert.equal(r.status, 'NOT_STARTED')
  assert.equal(r.isValid, true)
  assert.equal(r.ignoredTokens, undefined)
})

// 2. Kata tak dikenal setelah slot deadline terisi -> peringatan, tetap bisa submit.
check('2. token asing non-blocking', () => {
  const r = one('buat mie, high, 1 hari, zxcv')
  assert.equal(r.isValid, true)
  assert.deepEqual(r.ignoredTokens, ['zxcv'])
})

// 3. Token kalah slot deadline ikut dilaporkan, urutan terjaga.
check('3. dua token asing berurutan', () => {
  const r = one('buat mie, dimulai, zxcv, qwer')
  assert.equal(r.isValid, true)
  assert.deepEqual(r.ignoredTokens, ['zxcv', 'qwer'])
})

// 4. Regresi: baris lengkap yang sudah benar tidak boleh tiba-tiba berisik.
check('4. regresi baris bersih', () => {
  const r = one('Kirim laporan, Low, 2026-09-30, started')
  assert.equal(r.isValid, true)
  assert.equal(r.priority, 'LOW')
  assert.equal(r.status, 'NOT_STARTED')
  assert.equal(r.ignoredTokens, undefined)
  assert.equal(r.error, undefined)
})

// 5. Tanggal salah -> blokir (keputusan PO).
check('5. tanggal mustahil memblokir', () => {
  const r = one('Audit, 2026-13-45')
  assert.equal(r.isValid, false)
  assert.ok(r.error && r.error.length > 0)
})

// 6. "sedang" tetap MEDIUM, tidak boleh dibajak jadi status.
check('6. sedang tetap prioritas', () => {
  const r = one('Rapat, sedang')
  assert.equal(r.priority, 'MEDIUM')
  assert.equal(r.status, D.status)
})

// 7. Urutan token bebas — "dimulai" duluan tidak merebut slot deadline.
check('7. urutan token bebas', () => {
  const r = one('buat mie, dimulai, high, 1 hari')
  assert.equal(r.status, 'NOT_STARTED')
  assert.equal(r.priority, 'HIGH')
  assert.equal(r.isValid, true)
  assert.equal(r.ignoredTokens, undefined)
  assert.equal(daysFromNow(r.deadlineDate), 1)
})

// 8. Tahun 2 digit tidak didukung -> blokir, bukan diam-diam pakai default.
check('8. 30-09-26 memblokir', () => {
  const r = one('Audit, 30-09-26')
  assert.equal(r.isValid, false)
  assert.ok(r.error && r.error.length > 0)
})

// 9. Sisi kedua putusan PO.
check('9. dikerjakan -> IN_PROGRESS', () => {
  assert.equal(one('X, dikerjakan').status, 'IN_PROGRESS')
})

// 10. Status duplikat: yang kalah tidak boleh hilang senyap.
check('10. status duplikat dilaporkan', () => {
  const r = one('X, dimulai, dikerjakan')
  assert.equal(r.status, 'IN_PROGRESS')
  assert.ok(r.ignoredTokens?.length, 'token status yang kalah harus masuk ignoredTokens')
  assert.deepEqual(r.ignoredTokens, ['dimulai'])
})

console.log(`OK — ${n} kasus lolos (bulk parser)`)
