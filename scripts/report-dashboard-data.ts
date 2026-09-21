// Dump data aktual /api/dashboard per account — persis seperti logika
// app/api/dashboard/route.ts + lib/dashboard-aggregate.ts (range tab, metric,
// donut status, Action Required, tabel overdue).
// Jalankan: npx tsx scripts/report-dashboard-data.ts
// Output: docs/DASHBOARD-DATA.md (ground truth untuk cek validasi UI).
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { aggregateDashboard, shortRef } from '../lib/dashboard-aggregate'
import type { User, Prisma } from '../lib/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DAY_MS = 86_400_000
const RANGES = ['today', 'week', 'month', 'quarter', 'all'] as const
type Range = (typeof RANGES)[number]

function apScopeFor(user: User): Record<string, unknown> {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { companyId: user.companyId }
  if (user.role === 'MANAGER') return { divisionId: user.divisionId }
  return { picId: user.id }
}

function proposalScopeFor(user: User): Record<string, unknown> {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') return { proposer: { companyId: user.companyId } }
  if (user.role === 'MANAGER') return { proposer: { divisionId: user.divisionId } }
  return { proposerId: user.id }
}

function startOfWindow(range: Range) {
  const now = new Date()
  const start = new Date(now)
  if (range === 'today') start.setHours(0, 0, 0, 0)
  if (range === 'week') {
    const dayFromMonday = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - dayFromMonday)
    start.setHours(0, 0, 0, 0)
  }
  if (range === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }
  if (range === 'quarter') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1)
    start.setHours(0, 0, 0, 0)
  }
  return start
}

function deadlineLabel(iso: Date, now: Date) {
  const diff = iso.getTime() - now.getTime()
  if (diff <= 0) return `Lewat ${Math.max(1, Math.ceil(-diff / DAY_MS))} hari`
  if (diff < 3_600_000) return 'Kurang dari 1 jam'
  if (diff < DAY_MS) return `${Math.ceil(diff / 3_600_000)} jam tersisa`
  if (diff < 2 * DAY_MS) return 'Besok'
  return `${Math.ceil(diff / DAY_MS)} hari lagi`
}

const ROLE_LABEL: Record<User['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_OPERATIONAL: 'Admin Operasional',
  MANAGER: 'Manager',
  PIC: 'PIC',
  GUEST: 'Guest',
}

async function dumpAccount(email: string, now: Date): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      company: { select: { name: true } },
      division: { select: { name: true } },
      userLabel: { select: { name: true } },
    },
  })
  if (!user) return `## ${email} — TIDAK DITEMUKAN\n\n---\n`

  const scope = apScopeFor(user)
  const pScope = proposalScopeFor(user)

  const results: { range: Range; agg: ReturnType<typeof aggregateDashboard>; proposalCount: number }[] = []
  for (const range of RANGES) {
    const windowWhere: Prisma.ActionPlanWhereInput | null =
      range === 'all'
        ? null
        : { OR: [{ endDate: { gte: startOfWindow(range) } }, { status: 'OVERDUE' }] }

    const where: Prisma.ActionPlanWhereInput = {
      AND: [scope as Prisma.ActionPlanWhereInput, { deletedAt: null }, ...(windowWhere ? [windowWhere] : [])],
    }
    const actionPlans = await prisma.actionPlan.findMany({
      where,
      orderBy: { endDate: 'desc' },
      take: 2000,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        picId: true,
        pic: { select: { name: true } },
        outcomeKpi: true,
        evidenceLink: true,
        endDate: true,
        createdAt: true,
      },
    })
    const proposals = await prisma.proposal.findMany({
      where: { AND: [pScope, { deletedAt: null, status: 'SUBMITTED' }] },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        proposer: { select: { name: true } },
        createdAt: true,
      },
    })

    results.push({
      range,
      agg: aggregateDashboard(
        actionPlans,
        proposals.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          proposerName: p.proposer.name,
          createdAt: p.createdAt,
        }))
      ),
      proposalCount: proposals.length,
    })
  }

  const week = results.find((r) => r.range === 'week')!.agg
  const lines: string[] = []
  lines.push(`## ${user.name} (${email}) — ${ROLE_LABEL[user.role]}`)
  lines.push(
    `Company: ${user.company?.name ?? '-'} · Divisi: ${user.division?.name ?? '-'} · Label: ${user.userLabel?.name ?? '-'}`
  )
  lines.push('')

  // ===== Range matrix (validasi tab Hari Ini/Minggu/Bulan/Kuartal/Semua) =====
  lines.push(`**Matriks rentang:**`)
  lines.push('| Rentang | Total | Selesai | Dikerjakan | Review | Terlambat | Butuh Aksi | Proposal diajukan |')
  lines.push('|---|---|---|---|---|---|---|---|')
  for (const { range, agg, proposalCount } of results) {
    lines.push(
      `| ${range.padEnd(7)} | ${agg.metrics.total} | ${agg.metrics.complete} | ${agg.metrics.inProgress} | ${agg.metrics.inReview} | ${agg.metrics.overdue} | ${agg.actionRequired.length} | ${proposalCount} |`
    )
  }
  lines.push('')

  // ===== Detail default (week) =====
  const m = week.metrics
  lines.push(`**Metric cards (default = minggu ini):**`)
  lines.push(
    `Total=${m.total} · Selesai=${m.complete} (${m.completionRate.toFixed(1)}%) · Dikerjakan=${m.inProgress} · Review=${m.inReview} · Terlambat=${m.overdue}`
  )
  lines.push('')
  lines.push(`**Donut status (minggu ini):**`)
  for (const s of week.statusBreakdown) lines.push(`  - ${s.status.padEnd(18)} ${s.count}`)
  lines.push(`**Donut prioritas:**`)
  for (const p of week.priorityBreakdown) lines.push(`  - ${p.priority.padEnd(6)} ${p.count}`)
  lines.push('')

  lines.push(`**Action Required — butuh keputusan (${week.actionRequired.length}):**`)
  for (const a of week.actionRequired) {
    lines.push(
      `  - ${a.refCode.padEnd(8)} [${a.status}] ${a.title} — PIC: ${a.picName} · tenggat: ${a.deadline ? `${deadlineLabel(new Date(a.deadline), now)}` : '-'}${a.evidenceLink ? ' · bukti: ' + a.evidenceLink : ''}`
    )
  }
  lines.push('')

  lines.push(`**Overdue & risk (tabel bawah, 10 teratas urut risk/lama):**`)
  for (const o of week.overdueList.slice(0, 10)) {
    lines.push(
      `  - ${o.refCode.padEnd(8)} risk=${o.risk.padEnd(8)} late=${String(o.lateDays).padStart(3)} hari · ${o.title} (${o.picName}) · ${o.deadline.slice(0, 10)}`
    )
  }
  lines.push('', '---', '')
  return lines.join('\n')
}

async function main() {
  const now = new Date()
  const out: string[] = [
    `# DASHBOARD — Data Dummy Ground Truth (Executive Cockpit)`,
    ``,
    `Diedit: ${now.toISOString()} (label tenggat relatif terhadap waktu ini)`,
    ``,
    `Persis logika \`app/api/dashboard/route.ts\` + \`lib/dashboard-aggregate.ts\`.`,
    ``,
    `- Tab rentang memfilter AP: \`endDate >= startWindow\` **ATAU** status \`OVERDUE\` (overdue selalu masuk, berapapun rentangnya).`,
    `- \`week\` = Senin..sekarang; \`month\` = tgl 1..sekarang; \`quarter\` = awal kuartal..sekarang; \`all\` = seluruh riwayat (cap 2000 baris).`,
    `- Action Required = PENDING_APPROVAL + EVIDENCE_REQUIRED (AP) + proposal SUBMITTED (PR).`,
    `- Overdue list dikirim 100 kandidat (lateDays = hari lewat tenggat); client tampilkan 10 teratas.`,
    ``,
    `# STATUS`,
    ``,
  ]

  const sections: string[] = []
  for (const email of ['admin@promap.com', 'budi@promapdemo.com', 'sari@retaildemo.com', 'feri@logistikdemo.com']) {
    sections.push(`# ${email.split('@')[0].toUpperCase()}\n\n` + (await dumpAccount(email, now)))
  }

  const body = out.join('\n') + sections.join('\n')
  writeFileSync('docs/DASHBOARD-DATA.md', body)
  console.log(`Lengkap. Tulis ke docs/DASHBOARD-DATA.md (${body.length} chars)`)
}

main()
  .catch((e) => {
    console.error(e.message ?? e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })