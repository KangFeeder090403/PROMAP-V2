/**
 * Self-check lib/mention-parse.ts + timeAgo. Tanpa framework.
 * Jalankan: npx tsx lib/__checks__/mention-parse.check.ts
 * Exit 0 = semua lolos, exit 1 = ada yang gagal.
 */
import assert from 'node:assert/strict'
import {
  findMentionTrigger,
  extractMentionIds,
  tokenizeMentions,
} from '../mention-parse'
import { timeAgo } from '../date-utils'

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`  ok  ${name}`)
}

console.log('K2 — regex trigger popover mention')

check('a@b TIDAK trigger (ada karakter kata sebelum @)', () => {
  assert.equal(findMentionTrigger('a@b'), null)
  assert.equal(findMentionTrigger('kirim ke budi@promap'), null)
})

check('@ di awal baris TRIGGER', () => {
  const t = findMentionTrigger('@')
  assert.notEqual(t, null)
  assert.equal(t!.query, '')
  assert.equal(t!.start, 0)
})

check('dua spasi internal BERHENTI trigger', () => {
  // satu spasi internal masih trigger (nama depan + nama belakang)
  const satu = findMentionTrigger('halo @budi san')
  assert.notEqual(satu, null)
  assert.equal(satu!.query, 'budi san')
  // spasi kedua menutup popover
  assert.equal(findMentionTrigger('halo @budi san tolong'), null)
})

check('@ setelah whitespace/kurung trigger, start menunjuk ke @', () => {
  const t = findMentionTrigger('halo @bu')
  assert.notEqual(t, null)
  assert.equal(t!.query, 'bu')
  assert.equal('halo @bu'[t!.start], '@')
  assert.notEqual(findMentionTrigger('(@bu'), null)
  const nl = findMentionTrigger('baris1\n@bu')
  assert.notEqual(nl, null)
  assert.equal('baris1\n@bu'[nl!.start], '@')
})

check('query di-lowercase untuk pencocokan case-insensitive', () => {
  assert.equal(findMentionTrigger('halo @BuDi')!.query, 'budi')
})

console.log('extractMentionIds')

check('ambil id unik, abaikan token pendek', () => {
  const id = 'cmg7x9k2a0001abcd1234ef'
  assert.deepEqual(extractMentionIds(`halo @${id} dan @${id}`), [id])
  assert.deepEqual(extractMentionIds('halo @bu'), [])
})

console.log('tokenizeMentions — id prefiks id lain (bug alternasi)')

check('id yang jadi prefiks id lain tidak menyisakan karakter menggantung', () => {
  const short = 'cmg7x9k2a0001abcd1234'
  const long = short + 'zzzz' // prefiksnya persis `short`
  const tokens = tokenizeMentions(`@${long} halo @${short}`)
  assert.deepEqual(tokens, [
    { type: 'mention', id: long },
    { type: 'text', value: ' halo ' },
    { type: 'mention', id: short },
  ])
})

check('teks tanpa mention jadi satu token teks', () => {
  assert.deepEqual(tokenizeMentions('halo dunia'), [{ type: 'text', value: 'halo dunia' }])
  assert.deepEqual(tokenizeMentions(''), [])
})

console.log('K3 — timeAgo (now WAJIB dioper)')

check('ambang menit/jam/hari dan fallback tanggal setelah 30 hari', () => {
  const now = new Date('2026-09-17T12:00:00.000Z')
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()
  assert.equal(timeAgo(ago(30_000), now), 'baru saja')
  assert.equal(timeAgo(ago(5 * 60_000), now), '5 menit lalu')
  assert.equal(timeAgo(ago(3 * 3_600_000), now), '3 jam lalu')
  assert.equal(timeAgo(ago(2 * 86_400_000), now), '2 hari lalu')
  // 40 hari -> tanggal absolut, bukan "40 hari lalu"
  const jauh = timeAgo(ago(40 * 86_400_000), now)
  assert.match(jauh, /\d{4}/)
  assert.doesNotMatch(jauh, /hari lalu/)
})

console.log(`\n${passed} check lolos.`)
