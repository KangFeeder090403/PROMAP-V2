// Dump data aktual /api/my-work per account seed — persis seperti logika
// validasi di MyWorkClient (tab, banner, pipeline, reviewer, tenggat 7 hari).
// Jalankan: npx tsx scripts/report-my-work-data.ts
// Output: docs/MY-WORK-DATA.md (ground truth untuk cek validasi UI).
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import type { ActionPlanStatus } from '../lib/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DAY_MS = 86_400_000
const AKSI_STATUSES: ActionPlanStatus[] = ['REJECTED', 'EVIDENCE_REQUIRED', 'OVERDUE']
const DONE_STATUSES: ActionPlanStatus[] = ['COMPLETE', 'APPROVED']

function shortRef(id: string, prefix: string) {
  return `${prefix}-${id.slice(-6).toUpperCase()}`
}

function deadlineLabel(iso: Date, now: Date) {
  const diff = iso.getTime() - now.getTime()
  if (diff <= 0) return `Lewat ${Math.max(1, Math.ceil(-diff / DAY_MS))} hari`
  if (diff < 3_600_000) return 'Kurang dari 1 jam'
  if (diff < DAY_MS) return `${Math.ceil(diff / 3_600_000)} jam tersisa`
  if (diff < 2 * DAY_MS) return 'Besok'
  return `${Math.ceil(diff / DAY_MS)} hari lagi`
}

function fmt(d: Date | null) {
  if (!d) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function dumpPic(email: string, now: Date): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: { select: { name: true } }, division: { select: { name: true } } },
  })
  if (!user) return `# ${email} — TIDAK DITEMUKAN\n`

  const aps = await prisma.actionPlan.findMany({
    where: { picId: user.id, deletedAt: null },
    include: {
      task: { select: { title: true, project: { select: { name: true } } } },
      checklists: { select: { isDone: true } },
    },
    orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
  })
  const drafts = await prisma.proposal.findMany({
    where: { proposerId: user.id, deletedAt: null, status: 'DRAFT' },
    select: { id: true, title: true },
  })

  const pendingDivisionIds = [
    ...new Set(
      aps
        .filter((ap) => ap.status === 'PENDING_APPROVAL' && ap.divisionId)
        .map((ap) => ap.divisionId)
        .filter((id): id is string => id !== null)
    ),
  ]
  const managers = pendingDivisionIds.length
    ? await prisma.user.findMany({
        where: { role: 'MANAGER', status: 'ACTIVE', deletedAt: null, divisionId: { in: pendingDivisionIds } },
        select: { divisionId: true, name: true },
      })
    : []
  const reviewerByDivision = new Map(managers.map((m) => [m.divisionId, m.name]))

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(todayStart.getTime() + 7 * DAY_MS)

  const isAksi = (s: ActionPlanStatus) => AKSI_STATUSES.includes(s)
  const isDone = (s: ActionPlanStatus) => DONE_STATUSES.includes(s)

  const rows = aps.map((ap) => ({
    ref: shortRef(ap.id, 'AP'),
    title: ap.title,
    status: ap.status,
    priority: ap.priority,
    end: ap.endDate,
    checklist: `${ap.checklists.filter((c) => c.isDone).length}/${ap.checklists.length}`,
    project: ap.task?.project?.name ?? ap.task?.title ?? 'Pribadi',
    reviewer: ap.status === 'PENDING_APPROVAL' ? (ap.divisionId ? reviewerByDivision.get(ap.divisionId) ?? '?' : '(personal)') : null,
    reviewNote: ap.reviewNote,
  }))

  const tabSemua = aps.length
  const tabAksi =
    aps.filter((ap) => isAksi(ap.status)).length + drafts.length
  const tabMinggu = aps.filter(
    (ap) => !isDone(ap.status) && ap.endDate.getTime() >= now.getTime() && ap.endDate <= weekEnd
  ).length
  const tabSelesai = aps.filter((ap) => isDone(ap.status)).length

  const aksiItems = [
    ...aps
      .filter((ap) => isAksi(ap.status))
      .map((ap) => `${shortRef(ap.id, 'AP')} [${ap.status}] ${ap.title}`),
    ...drafts.map((p) => `${shortRef(p.id, 'PR')} [DRAFT] ${p.title}`),
  ]
  const inProgress = aps.filter((ap) => ap.status === 'IN_PROGRESS' || ap.status === 'NOT_STARTED')
  const inReview = aps.filter((ap) => ap.status === 'PENDING_APPROVAL')
  const completed = aps.filter((ap) => isDone(ap.status))
  const upcoming = aps.filter((ap) => !isDone(ap.status)).sort((a, b) => a.endDate.getTime() - b.endDate.getTime()).slice(0, 5)
  const pct = aps.length ? Math.round((completed.length / aps.length) * 100) : 0
  const byRef = (list: typeof aps) => rows.filter((r) => list.some((ap) => shortRef(ap.id, 'AP') === r.ref))

  const lines: string[] = [
    `## ${user.name} (${email}) — ${user.role}`,
    `Company: ${user.company?.name} · Divisi: ${user.division?.name}`,
    ``,
    `**Tab counts:** Semua=${tabSemua} · Butuh Aksi=${tabAksi} · Deadline Minggu Ini=${tabMinggu} · Selesai=${tabSelesai}`,
    `**Ring Progres:** ${pct}% tuntas (${completed.length} selesai / ${aps.length} total · dalam proses ${aps.length - completed.length})`,
    ``,
    `**Butuh Aksi (banner):** ${aksiItems.length}`,
  ]
  for (const item of aksiItems) lines.push(`  - ${item}`)
  lines.push(``)

  const group = (label: string, list: typeof rows, extra?: (r: (typeof rows)[number]) => string) => {
    lines.push(`**${label} (${list.length}):**`)
    for (const g of list) {
      lines.push(
        `  - ${g.ref} ${g.status.padEnd(18)} prio=${g.priority.padEnd(6)} checklist=${g.checklist} tenggat=${fmt(g.end)} label="${deadlineLabel(g.end, now)}" ${extra ? extra(g) : ''}`
      )
    }
    lines.push(``)
  }

  group('Sedang Dikerjakan (IN_PROGRESS/NOT_STARTED)', byRef(inProgress))
  group('Menunggu Review (PENDING_APPROVAL)', byRef(inReview), (g) => `reviewer=${g.reviewer}`)
  group('Selesai (COMPLETE/APPROVED)', byRef(completed))

  lines.push(`**Tenggat terdekat (5 teratas):**`)
  for (const u of upcoming) {
    lines.push(
      `  - ${shortRef(u.id, 'AP')} ${u.title} — ${fmt(u.endDate)} → ${deadlineLabel(u.endDate, now)}`
    )
  }
  lines.push(``, `---`, ``)

  return lines.join('\n')
}

async function main() {
  const now = new Date()
  const out: string[] = [
    `# MY WORK — Data Dummy Ground Truth`,
    ``,
    `Diedit: ${now.toISOString()} (semua label tenggat relatif terhadap waktu ini)`,
    ``,
    `Catatan: sesuai logika validasi di \`components/my-work/MyWorkClient.tsx\` + \`app/api/my-work/route.ts\`.`,
    ``,
    `- Tab **Semua** = seluruh AP milik user (picId=self).`,
    `- Tab **Butuh Aksi Saya** = REJECTED + EVIDENCE_REQUIRED + OVERDUE + proposal DRAFT.`,
    `- Tab **Deadline Minggu Ini** = AP belum selesai dengan endDate hari ini..+7 hari.`,
    `- Tab **Selesai** = COMPLETE + APPROVED.`,
    ``,
    `# STATUS`,
    ``,
  ]

  const emps = [
    'rian@promapdemo.com',
    'dinda@promapdemo.com',
    'nadia@promapdemo.com',
    'andi@promapdemo.com',
    'surya@retaildemo.com',
    'mega@retaildemo.com',
    'joko@logistikdemo.com',
    'intan@logistikdemo.com',
  ]
  const sections = await Promise.all(emps.map(async (e) => `# ${e.split('@')[0].toUpperCase()}\n\n` + (await dumpPic(e, now))))

  const body = out.join('\n') + sections.join('\n')
  writeFileSync('docs/MY-WORK-DATA.md', body)
  console.log(`Lengkap. Tulis ke docs/MY-WORK-DATA.md (${body.length} chars)`)
}

main()
  .catch((e) => {
    console.error(e.message ?? e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })