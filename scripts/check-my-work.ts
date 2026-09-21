// Verifikasi query inti /api/my-work untuk account seed nyata.
// Jalankan: npx tsx scripts/check-my-work.ts
import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function assert(cond: boolean, label: string) {
  if (!cond) throw new Error(`FAIL: ${label}`)
  console.log(`  ✓ ${label}`)
}

const AKSI_STATUSES = ['REJECTED', 'EVIDENCE_REQUIRED', 'OVERDUE']

async function analyze(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { division: { select: { name: true } } },
  })
  if (!user) throw new Error(`User "${email}" tidak ditemukan`)

  const actionPlans = await prisma.actionPlan.findMany({
    where: { picId: user.id, deletedAt: null },
    include: {
      task: { select: { title: true, project: { select: { name: true } } } },
      checklists: { select: { isDone: true } },
    },
  })

  const draftProposals = await prisma.proposal.findMany({
    where: { proposerId: user.id, deletedAt: null, status: 'DRAFT' },
    select: { id: true, status: true },
  })

  const pendingDivisionIds = [
    ...new Set(
      actionPlans.filter((ap) => ap.status === 'PENDING_APPROVAL' && ap.divisionId).map((ap) => ap.divisionId) as string[]
    ),
  ]
  const managers = pendingDivisionIds.length
    ? await prisma.user.findMany({
        where: { role: 'MANAGER', status: 'ACTIVE', deletedAt: null, divisionId: { in: pendingDivisionIds } },
        select: { divisionId: true, name: true },
      })
    : []
  const reviewerByDivision = new Map(managers.map((m) => [m.divisionId, m.name]))

  const byStatus = new Map<string, number>()
  let checklistItems = 0
  let checklistDone = 0
  for (const ap of actionPlans) {
    byStatus.set(ap.status, (byStatus.get(ap.status) ?? 0) + 1)
    checklistItems += ap.checklists.length
    checklistDone += ap.checklists.filter((c) => c.isDone).length
  }

  const aksiCount = [...byStatus.entries()].reduce((n, [s, c]) => (AKSI_STATUSES.includes(s) ? n + c : n), 0) + draftProposals.length
  const pendingReviewers = actionPlans
    .filter((ap) => ap.status === 'PENDING_APPROVAL')
    .map((ap) => (ap.divisionId ? reviewerByDivision.get(ap.divisionId) ?? '(unresolved)' : '(personal)'))

  return {
    name: user.name,
    division: user.division?.name,
    apCount: actionPlans.length,
    draftProposals: draftProposals.length,
    aksiCount,
    byStatus: Object.fromEntries(byStatus),
    pendingReviewers,
    checklistItems,
    checklistDone,
    rejectedReviewNotes: actionPlans.filter((ap) => ap.status === 'REJECTED').map((ap) => ap.reviewNote),
  }
}

async function main() {
  const joko = await analyze('joko@logistikdemo.com')
  console.log('Joko:', joko)
  assert(joko.apCount === 4, 'Joko punya 4 AP')
  assert(joko.byStatus['OVERDUE'] === 2, 'Joko 2 OVERDUE')
  assert(joko.checklistItems >= 5, 'Joko punya checklist untuk progress bar')

  const rian = await analyze('rian@promapdemo.com')
  console.log('Rian:', rian)
  assert(rian.aksiCount === 6, `Rian aksi = 5 overdue + 1 draft proposal — dapat ${rian.aksiCount}`)
  assert(rian.draftProposals === 1, 'Rian punya 1 draft proposal')

  const dinda = await analyze('dinda@promapdemo.com')
  console.log('Dinda:', dinda)
  assert(dinda.byStatus['PENDING_APPROVAL'] === 3, 'Dinda 3 AP menunggu review')
  assert(
    dinda.pendingReviewers.every((r) => r === 'Budi Santoso'),
    `Reviewer Dinda ter-resolve ke Manager divisi — dapat ${dinda.pendingReviewers.join(', ')}`
  )

  const andi = await analyze('andi@promapdemo.com')
  console.log('Andi:', andi)
  assert(andi.byStatus['REJECTED'] === 1, 'Andi 1 AP REJECTED (banner Butuh Aksi)')
  assert(andi.byStatus['EVIDENCE_REQUIRED'] === 2, 'Andi 2 AP EVIDENCE_REQUIRED (banner Butuh Aksi)')
  assert(
    andi.rejectedReviewNotes.length === 1 && Boolean(andi.rejectedReviewNotes[0]),
    'Andi punya catatan reviewer di AP REJECTED'
  )

  console.log('\nSemua assertion lolos — /api/my-work konsisten untuk PIC seed (Rian/Dinda/Andi/Joko).')
}

main()
  .catch((e) => {
    console.error(e.message ?? e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })