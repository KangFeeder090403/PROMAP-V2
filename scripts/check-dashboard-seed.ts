import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { aggregateDashboard } from '../lib/dashboard-aggregate'
import type { User } from '../lib/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function apScopeFor(user: User): { companyId?: string; divisionId?: string | null; picId?: string } {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { companyId: user.companyId! }
  if (user.role === 'MANAGER') return { divisionId: user.divisionId }
  return { picId: user.id }
}

async function scopedAPs(user: User) {
  return prisma.actionPlan.findMany({
    where: { ...apScopeFor(user), deletedAt: null },
    select: {
      status: true,
      priority: true,
      picId: true,
      pic: { select: { name: true } },
      id: true,
      title: true,
      outcomeKpi: true,
      evidenceLink: true,
      endDate: true,
    },
  })
}

function assert(cond: boolean, label: string) {
  if (!cond) throw new Error(`FAIL: ${label}`)
  console.log(`  ✓ ${label}`)
}

async function main() {
  const superAdmin = (await prisma.user.findUnique({ where: { email: 'admin@promap.com' } }))!
  const managerA = (await prisma.user.findUnique({ where: { email: 'budi@promapdemo.com' } }))!
  const managerB = (await prisma.user.findUnique({ where: { email: 'sari@retaildemo.com' } }))!
  const managerC = (await prisma.user.findUnique({ where: { email: 'feri@logistikdemo.com' } }))!
  const picJoko = (await prisma.user.findUnique({ where: { email: 'joko@logistikdemo.com' } }))!
  const picNadia = (await prisma.user.findUnique({ where: { email: 'nadia@promapdemo.com' } }))!
  const dinda = (await prisma.user.findUnique({ where: { email: 'dinda@promapdemo.com' } }))!

  // Per-divisi values (dikontrol seed — meski ada data legacy, scope divisi tidak terpengaruh)
  const apA = await scopedAPs(managerA)
  const apB = await scopedAPs(managerB)
  const apC = await scopedAPs(managerC)
  const allAPs = await scopedAPs(superAdmin)
  const jokoAPs = await scopedAPs(picJoko)
  const dindaAPs = await scopedAPs(dinda)

  console.log('Scope lintas role:')
  assert(apA.length === 31, `Manager A hanya divisi Marketing & Growth (31) — dapat ${apA.length}`)
  assert(apB.length === 9, `Manager B hanya divisi Retail & Distribusi (9) — dapat ${apB.length}`)
  assert(apC.length === 8, `Manager C hanya divisi Operasional (8) — dapat ${apC.length}`)
  assert(jokoAPs.length === 4, `PIC Joko hanya AP miliknya (4) — dapat ${jokoAPs.length}`)
  assert(dindaAPs.length === 6, `PIC Dinda hanya AP miliknya (6) — dapat ${dindaAPs.length}`)
  assert(
    allAPs.length >= apA.length + apB.length + apC.length,
    `Super Admin melihat SEMUA divisi (>= ${apA.length + apB.length + apC.length}, nyata ${allAPs.length}) — subsumes total divisi demo`
  )
  assert(allAPs.length >= 48, `Super Admin memuat 48 AP hasil seed (nyata ${allAPs.length}, termasuk data legacy)`)

  console.log('Agregat Super Admin (lintas tenant):')
  const allProposals = (
    await prisma.proposal.findMany({
      where: { deletedAt: null, status: 'SUBMITTED' },
      select: { id: true, title: true, status: true, createdAt: true, proposer: { select: { name: true } } },
    })
  ).map((p) => ({ id: p.id, title: p.title, status: p.status, createdAt: p.createdAt, proposerName: p.proposer.name }))
  const agg = aggregateDashboard(allAPs, allProposals)
  assert(agg.metrics.total === allAPs.length, `metrics.total = ${agg.metrics.total}`)
  assert(agg.statusBreakdown.length === 8, 'statusBreakdown 8 status')
  assert(agg.priorityBreakdown.length === 3, 'priorityBreakdown 3 prioritas')
  assert(agg.picWorkload.length >= 8, `workload memuat >= 8 PIC lintas tenant — dapat ${agg.picWorkload.length}`)
  assert(agg.picWorkload.some((w) => w.picName === 'Joko Susilo'), 'workload memuat PIC tenant C (Joko)')
  assert(agg.picWorkload.some((w) => w.picName === 'Mega Puspita'), 'workload memuat PIC tenant B (Mega)')
  assert(agg.picWorkload.some((w) => w.picName === 'Rian Aditya'), 'workload memuat PIC tenant A (Rian)')
  assert(agg.metrics.overdue >= 6, `ada >= 6 AP overdue lintas tenant (dapat ${agg.metrics.overdue})`)
  assert(agg.actionRequired.length >= 12, `Action Required >= 12 (pending+bukti+proposal lintas tenant) — dapat ${agg.actionRequired.length}`)

  console.log('Agregat Manager A (hanya 1 divisi):')
  const aggA = aggregateDashboard(
    apA,
    (await prisma.proposal.findMany({
      where: { proposer: { divisionId: managerA.divisionId }, deletedAt: null, status: 'SUBMITTED' },
      select: { id: true, title: true, status: true, createdAt: true, proposer: { select: { name: true } } },
    })).map((p) => ({ id: p.id, title: p.title, status: p.status, createdAt: p.createdAt, proposerName: p.proposer.name }))
  )
  assert(aggA.metrics.total === 31, `total 31 — dapat ${aggA.metrics.total}`)
  assert(aggA.metrics.overdue === 6, `overdue 6 — dapat ${aggA.metrics.overdue}`)
  assert(aggA.overdueList.length === 6, `overdueList 6 baris — dapat ${aggA.overdueList.length}`)
  assert(aggA.overdueList[0].lateDays >= 45, `overdue terlama >= 45 hari (nyata ${aggA.overdueList[0].lateDays})`)
  assert(aggA.overdueList[0].title === 'Percepatan Legalisasi NIB untuk Anak Usaha', 'terlama = AP Legal NIB (Rian, Critical)')
  assert(aggA.picWorkload.length === 4, `hanya 4 PIC di divisinya — dapat ${aggA.picWorkload.length}`)
  assert(aggA.picWorkload.find((w) => w.picName === 'Rian Aditya')?.overdue === 5, 'Rian overdue 5 → chip "Beban Tinggi"')
  assert(aggA.picWorkload.find((w) => w.picName === 'Dinda Lestari')?.review === 3, 'Dinda review 3 → chip "3 Review"')
  assert(
    aggA.actionRequired.filter((i) => i.kind === 'AP').length === 6,
    `AP butuh keputusan: 4 menunggu + 2 bukti — dapat ${aggA.actionRequired.filter((i) => i.kind === 'AP').length}`
  )

  console.log('Workload per PIC di Super Admin:')
  for (const w of [...agg.picWorkload].sort((a, b) => b.total - a.total).slice(0, 10)) {
    console.log(`  ${w.picName.padEnd(16)} total=${String(w.total).padStart(2)} overdue=${w.overdue} review=${w.review} active=${w.active} done=${w.done}`)
  }

  console.log('\nSemua assertion lolos ✓')
}

main()
  .catch((e) => {
    console.error(e.message ?? e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })