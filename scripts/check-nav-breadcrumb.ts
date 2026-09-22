// Self-check nav + breadcrumb — assert-based, tanpa framework.
// Jalankan: npx tsx scripts/check-nav-breadcrumb.ts
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { NAV_GROUPS, ALL_NAV_ITEMS, matchesPath, findNavItem } from '@/components/layout/nav-config'
import { SEGMENT_GROUP } from '@/components/layout/Breadcrumb'
import { CREATE_ITEMS } from '@/components/layout/NewButton'

let n = 0
function check(desc: string, fn: () => void) {
  fn()
  n++
}

const ROOT = process.cwd()
const DASHBOARD = path.join(ROOT, 'app', '(dashboard)')

// 1. Setiap href di nav punya file page yang benar-benar ada — cegah link mati.
for (const item of ALL_NAV_ITEMS) {
  check(`page ada untuk ${item.href}`, () => {
    const rel = item.href === '/' ? 'page.tsx' : path.join(...item.href.slice(1).split('/'), 'page.tsx')
    const file = path.join(DASHBOARD, rel)
    assert.ok(existsSync(file), `nav "${item.label}" → ${item.href} tapi ${file} tidak ada`)
  })
}

// 2. Tidak ada label grup duplikat (grup tanpa label boleh lebih dari satu? tidak — cek juga).
check('label grup unik', () => {
  const labels = NAV_GROUPS.map((g) => g.label)
  assert.equal(new Set(labels).size, labels.length, `label grup duplikat: ${labels.join(', ')}`)
})

// 3. Tidak ada href duplikat.
check('href unik', () => {
  const hrefs = ALL_NAV_ITEMS.map((i) => i.href)
  assert.equal(new Set(hrefs).size, hrefs.length, `href duplikat: ${hrefs.join(', ')}`)
})

// 4. SEGMENT_GROUP tidak pernah menghasilkan undefined untuk route nav + /action-plans.
//    undefined = crumb grup hilang diam-diam / render "undefined" di UI.
const ROUTES = [...ALL_NAV_ITEMS.map((i) => i.href), '/action-plans']
for (const route of ROUTES) {
  if (route === '/') continue
  check(`SEGMENT_GROUP terdefinisi untuk ${route}`, () => {
    const seg = route.split('/')[1]
    assert.ok(seg in SEGMENT_GROUP, `segment "${seg}" belum ada di SEGMENT_GROUP`)
    const group = SEGMENT_GROUP[seg]
    assert.ok(group === null || typeof group === 'string', `SEGMENT_GROUP["${seg}"] bukan string|null`)
  })
}

// 5. matchesPath: root tidak boleh match semua route (bug klasik startsWith).
check('matchesPath root tidak greedy', () => {
  assert.equal(matchesPath('/', '/'), true)
  assert.equal(matchesPath('/', '/projects'), false)
  assert.equal(matchesPath('/projects', '/projects'), true)
  assert.equal(matchesPath('/projects', '/projects/abc'), true)
  assert.equal(matchesPath('/projects', '/projects-archive'), false)
})

check('findNavItem menemukan item benar', () => {
  assert.equal(findNavItem('/')?.label, 'Home')
  assert.equal(findNavItem('/my-work')?.label, 'My Work')
  assert.equal(findNavItem('/settings/leads')?.label, 'Settings')
  assert.equal(findNavItem('/action-plans'), undefined) // sengaja tidak di nav
})

// 6. CREATE_ITEMS invariants.
check('CREATE_ITEMS roles tidak kosong', () => {
  for (const item of CREATE_ITEMS) {
    assert.ok(item.roles.length > 0, `CREATE_ITEMS "${item.label}" roles kosong`)
  }
})

check('CREATE_ITEMS Project tidak untuk PIC', () => {
  const project = CREATE_ITEMS.find((i) => i.label === 'Project')
  assert.ok(project, 'item "Project" hilang')
  assert.equal(project.roles.includes('PIC'), false, 'PIC tidak boleh bikin Project')
})

check('CREATE_ITEMS tidak memuat "Task"', () => {
  assert.equal(CREATE_ITEMS.some((i) => i.label === 'Task'), false, '"Task" dihapus atas keputusan PO')
})

console.log(`OK — ${n} assertions passed (nav + breadcrumb)`)
