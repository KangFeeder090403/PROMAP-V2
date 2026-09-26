// Self-check wiring "?new=1" — assert-based, tanpa framework.
// Jalankan: npx tsx scripts/check-new-param.ts
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { CREATE_ITEMS } from '@/components/layout/NewButton'

let n = 0
function check(desc: string, fn: () => void) {
  fn()
  n++
}

const ROOT = process.cwd()
const DASHBOARD = path.join(ROOT, 'app', '(dashboard)')
const read = (p: string) => readFileSync(p, 'utf8')

// 1. Setiap href "?new=1" punya page.tsx yang ada DAN membaca searchParams.
//    Tanpa ini, klik "+ New" cuma navigasi — modal tidak pernah terbuka.
for (const item of CREATE_ITEMS) {
  const [href, query] = item.href.split('?')
  if (query !== 'new=1') continue
  const seg = href.slice(1)
  const file = path.join(DASHBOARD, seg, 'page.tsx')

  check(`page ada untuk ${item.href}`, () => {
    assert.ok(existsSync(file), `CREATE_ITEMS "${item.label}" → ${item.href} tapi ${file} tidak ada`)
  })
  check(`${seg}/page.tsx membaca searchParams`, () => {
    assert.match(read(file), /searchParams/, `${file} tidak membaca searchParams → ?new=1 diabaikan`)
  })
}

// 2. Tiap client target membersihkan param setelah modal dibuka.
const CLIENTS = [
  'components/projects/ProjectsClient.tsx',
  'components/action-plans/ActionPlansClient.tsx',
  'components/proposals/ProposalsClient.tsx',
]
for (const rel of CLIENTS) {
  check(`${rel} membersihkan URL`, () => {
    const src = read(path.join(ROOT, rel))
    assert.match(src, /openCreate/, `${rel} tidak menerima prop openCreate`)
    assert.match(src, /router\.replace\(/, `${rel} harus router.replace (bukan push) agar back aman`)
    assert.doesNotMatch(src, /router\.push\('\/(projects|action-plans|proposals)'\)/, `${rel} pakai push untuk bersihkan param`)
  })
}

// 3. Gating role untuk create Project terjadi di server, di jalur searchParams.new.
check('projects/page.tsx gating role di server', () => {
  const src = read(path.join(DASHBOARD, 'projects', 'page.tsx'))
  assert.match(src, /searchParams\.new/, 'projects/page.tsx tidak membaca searchParams.new')
  assert.match(src, /MANAGER/, 'projects/page.tsx tidak memuat daftar role — gating hilang')
  assert.doesNotMatch(src, /'PIC'/, 'PIC tidak boleh lolos gating create Project')
})

// 4. Daftar role di ProjectsClient sinkron dengan CREATE_ITEMS.
//    Kalau lepas sinkron, menu tampil tapi modal tidak pernah render.
check('CAN_MANAGE ProjectsClient = roles item Project', () => {
  const project = CREATE_ITEMS.find((i) => i.label === 'Project')
  assert.ok(project, 'item "Project" hilang dari CREATE_ITEMS')
  const src = read(path.join(ROOT, 'components/projects/ProjectsClient.tsx'))
  const m = src.match(/const CAN_MANAGE: Role\[\] = \[([^\]]*)\]/)
  assert.ok(m, 'CAN_MANAGE tidak ditemukan di ProjectsClient')
  const roles = [...m[1].matchAll(/'([A-Z_]+)'/g)].map((r) => r[1])
  assert.deepEqual(
    [...roles].sort((a, b) => a.localeCompare(b, 'id')),
    [...project.roles].sort((a, b) => a.localeCompare(b, 'id')),
    'CAN_MANAGE lepas sinkron dengan CREATE_ITEMS'
  )
})

// 5. Assert NEGATIF — 'Personal Task' tidak boleh kembali sebelum UI-4 siap.
//    /my-work belum punya modal create → item ini = tombol yang tidak melakukan apa-apa.
check("CREATE_ITEMS tidak memuat 'Personal Task'", () => {
  assert.equal(
    CREATE_ITEMS.some((i) => i.label === 'Personal Task'),
    false,
    "'Personal Task' dihapus sampai UI-4 (My Work) punya modal create"
  )
})

check("NewButton.tsx sumbernya bersih dari item 'Personal Task'", () => {
  const src = read(path.join(ROOT, 'components/layout/NewButton.tsx'))
  assert.doesNotMatch(
    src,
    /label:\s*'Personal Task'/,
    "item 'Personal Task' ditambahkan kembali — /my-work belum punya modal create"
  )
})

console.log(`OK — ${n} assertions passed (?new=1 wiring)`)
