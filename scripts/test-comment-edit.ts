// Smoke test — assert-based, tanpa framework. Jalankan: npx tsx scripts/test-comment-edit.ts
// Murni logika jendela edit + delta mention: TANPA DB, TANPA network.
import {
  COMMENT_EDIT_WINDOW_MS,
  addedMentionIds,
  editDeadline,
  isWithinEditWindow,
} from '@/lib/comment-edit'
import { extractMentionIds } from '@/lib/mention-parse'

let failed = 0
function check(cond: boolean, label: string) {
  if (!cond) {
    failed++
    console.error(`FAIL: ${label}`)
  }
}

const created = new Date('2026-09-17T10:00:00.000Z')
const at = (ms: number) => new Date(created.getTime() + ms)
const MIN = 60_000

check(COMMENT_EDIT_WINDOW_MS === 15 * MIN, 'jendela edit = 15 menit')
check(editDeadline(created).getTime() === created.getTime() + 15 * MIN, 'editDeadline = createdAt + 15 menit')

// Batas ketat: TEPAT menit ke-15 sudah ditolak.
check(isWithinEditWindow(created, at(0)) === true, '0 menit -> boleh edit')
check(isWithinEditWindow(created, at(14 * MIN + 59_000)) === true, '14:59 -> boleh edit')
check(isWithinEditWindow(created, at(15 * MIN)) === false, '15:00 tepat -> DITOLAK')
check(isWithinEditWindow(created, at(15 * MIN + 1000)) === false, '15:01 -> ditolak')

// createdAt string ISO (bentuk yang datang dari JSON API) diperlakukan sama.
check(isWithinEditWindow(created.toISOString(), at(5 * MIN)) === true, 'string ISO diterima sama dengan Date')

// Delta mention — hanya id BARU yang perlu divalidasi ulang.
const A = 'clx0000000000000000000a'
const B = 'clx0000000000000000000b'
const C = 'clx0000000000000000000c'

const delta1 = addedMentionIds(extractMentionIds(`halo @${A} @${B}`), extractMentionIds(`halo @${A} @${C}`))
check(delta1.length === 1 && delta1[0] === C, '@A @B -> @A @C menghasilkan addedIds=[C]')

const delta2 = addedMentionIds(extractMentionIds(`halo @${A} @${B}`), extractMentionIds(`halo @${A}`))
check(delta2.length === 0, '@A @B -> @A menghasilkan addedIds kosong (hapus mention bukan tambah)')

const delta3 = addedMentionIds(extractMentionIds(`halo @${A}`), extractMentionIds(`halo @${A}`))
check(delta3.length === 0, 'konten mention identik menghasilkan addedIds kosong')

const delta4 = addedMentionIds(extractMentionIds('tanpa mention'), extractMentionIds(`baru @${A}`))
check(delta4.length === 1 && delta4[0] === A, 'mention pertama pada komentar tanpa mention masuk addedIds')

// extractMentionIds dedupe — duplikat tidak boleh jadi dua notifikasi.
check(extractMentionIds(`@${A} lalu @${A}`).length === 1, '@A @A dedupe jadi satu id')

if (failed > 0) {
  console.error(`\n${failed} assertion gagal`)
  process.exit(1)
}
console.log('test-comment-edit: semua assertion lolos')
