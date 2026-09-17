import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, apScope } from '@/lib/rbac'
import { getQuarterRange, overlapsPeriod } from '@/lib/report-period'
import { logActivity } from '@/lib/activity-log'

// Ringkasan angka untuk halaman Laporan.

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'] as const

type APItem = {
  id: string
  status: string
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
  evidenceLink: string | null
}

function calculateGovernanceIndex(
  completionPct: number,
  overdueRatio: number
): 'Prima' | 'Luar Biasa' | 'Stabil' | 'Waspada' | 'Kritis' {
  if (completionPct >= 95 && overdueRatio < 0.05) return 'Luar Biasa'
  if (completionPct >= 85 && overdueRatio < 0.1) return 'Prima'
  if (completionPct >= 70 && overdueRatio < 0.2) return 'Stabil'
  if (completionPct >= 50) return 'Waspada'
  return 'Kritis'
}

function buildDivisionWhere(
  user: { role: string; companyId: string | null; divisionId: string | null },
  hasDivisionFilter: boolean,
  divisionParam: string | null
): Record<string, unknown> {
  const divisionWhere: Record<string, unknown> = { deletedAt: null }
  if (user.role === 'ADMIN_OPERATIONAL') {
    divisionWhere.companyId = user.companyId!
  } else if (user.role === 'MANAGER') {
    divisionWhere.id = user.divisionId ?? '__NO_DIVISION__'
  }

  if (hasDivisionFilter && divisionParam) {
    divisionWhere.id = divisionParam
  }

  return divisionWhere
}

function generateAvailableQuarters(qNum: number, qYear: number) {
  const availableQuarters = []
  for (let i = 0; i < 4; i++) {
    let q = qNum - i
    let y = qYear
    if (q <= 0) {
      q += 4
      y -= 1
    }
    const sMonth = (q - 1) * 3
    const sDate = new Date(y, sMonth, 1)
    const eDate = new Date(y, sMonth + 3, 0)
    availableQuarters.push({
      value: `Q${q}-${y}`,
      label: `Q${q} ${y} (${sDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${eDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`,
    })
  }
  return availableQuarters
}

function calculateBottlenecks(
  pendingSignOffAPs: number,
  evidenceRequiredAPs: number,
  rejectedAPs: number,
  overdueAPs: number
) {
  const bottleneckTotal = pendingSignOffAPs + evidenceRequiredAPs + rejectedAPs + overdueAPs
  const share = (n: number) => (bottleneckTotal > 0 ? Math.round((n / bottleneckTotal) * 100) : 0)

  return [
    {
      label: 'Menunggu persetujuan Manager',
      count: pendingSignOffAPs,
      share: share(pendingSignOffAPs),
      description: 'Action Plan sudah diajukan PIC, belum ditinjau Manager.',
      status: 'PENDING_APPROVAL',
    },
    {
      label: 'Bukti kerja perlu dilengkapi',
      count: evidenceRequiredAPs + rejectedAPs,
      share: share(evidenceRequiredAPs + rejectedAPs),
      description: 'Dikembalikan ke PIC karena bukti kurang atau ditolak Manager.',
      status: 'EVIDENCE_REQUIRED',
    },
    {
      label: 'Lewat tenggat',
      count: overdueAPs,
      share: share(overdueAPs),
      description: 'Melewati tanggal selesai dan belum dituntaskan.',
      status: 'OVERDUE',
    },
  ]
}

function calculateKpiMetrics(allAPs: APItem[], prevTotal: number, prevCompleted: number) {
  const totalAPs = allAPs.length
  const completedAPs = allAPs.filter((ap) => ap.status === 'COMPLETE').length
  const overdueAPs = allAPs.filter((ap) => ap.status === 'OVERDUE').length
  const pendingSignOffAPs = allAPs.filter((ap) => ap.status === 'PENDING_APPROVAL').length
  const evidenceRequiredAPs = allAPs.filter((ap) => ap.status === 'EVIDENCE_REQUIRED').length
  const rejectedAPs = allAPs.filter((ap) => ap.status === 'REJECTED').length

  const goalRealization = totalAPs > 0 ? Math.round((completedAPs / totalAPs) * 1000) / 10 : 0
  const prevRealization = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 1000) / 10 : null
  const realizationTrend =
    prevRealization === null ? null : Math.round((goalRealization - prevRealization) * 10) / 10

  const completeAPs = allAPs.filter((ap) => ap.status === 'COMPLETE')
  let avgResolutionDays = 0
  if (completeAPs.length > 0) {
    const totalDays = completeAPs.reduce((sum, ap) => {
      const diff = ap.updatedAt.getTime() - ap.startDate.getTime()
      return sum + diff / (1000 * 60 * 60 * 24)
    }, 0)
    avgResolutionDays = Math.round((totalDays / completeAPs.length) * 10) / 10
  }

  const evidencedAPs = allAPs.filter((ap) => Boolean(ap.evidenceLink && ap.evidenceLink.trim() !== '')).length
  const evidenceCompliance = totalAPs > 0 ? Math.round((evidencedAPs / totalAPs) * 1000) / 10 : 0
  const notOverdueCount = totalAPs - overdueAPs
  const onTimeRate = totalAPs > 0 ? Math.round((notOverdueCount / totalAPs) * 1000) / 10 : 0

  return {
    totalAPs,
    completedAPs,
    overdueAPs,
    pendingSignOffAPs,
    evidenceRequiredAPs,
    rejectedAPs,
    goalRealization,
    realizationTrend,
    avgResolutionDays,
    evidenceCompliance,
    evidencedAPs,
    onTimeRate,
  }
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const forbidden = requireRole([...ALLOWED_ROLES])(user)
  if (forbidden) return forbidden

  const { searchParams } = new URL(req.url)
  const quarterParam = searchParams.get('quarter')
  const divisionParam = searchParams.get('division') // division id or 'ALL'

  const { start, end, label, quarterLabel, qNum, qYear } = getQuarterRange(quarterParam)
  const scope = apScope(user)

  // Scope sesuai role + hanya AP yang beririsan dengan periode
  const baseWhere: Record<string, unknown> = {
    ...scope,
    deletedAt: null,
    ...overlapsPeriod(start, end),
  }

  // Filter divisi berlaku untuk SUPER_ADMIN dan ADMIN_OPERATIONAL
  const hasDivisionFilter = Boolean(divisionParam && divisionParam !== 'ALL' && user.role !== 'MANAGER')
  if (hasDivisionFilter && divisionParam) {
    baseWhere.divisionId = divisionParam
  }

  // ─── 1. KPI Metrics ───────────────────────────────────────────
  const allAPs = await prisma.actionPlan.findMany({
    where: baseWhere,
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      evidenceLink: true,
    },
  })

  // Perbandingan dengan kuartal sebelumnya untuk tren capaian
  const prevQuarter = getQuarterRange(`Q${qNum === 1 ? 4 : qNum - 1}-${qNum === 1 ? qYear - 1 : qYear}`)
  const prevWhere: Record<string, unknown> = {
    ...scope,
    deletedAt: null,
    ...overlapsPeriod(prevQuarter.start, prevQuarter.end),
  }
  if (hasDivisionFilter && divisionParam) {
    prevWhere.divisionId = divisionParam
  }

  const [prevTotal, prevCompleted] = await Promise.all([
    prisma.actionPlan.count({ where: prevWhere }),
    prisma.actionPlan.count({ where: { ...prevWhere, status: 'COMPLETE' } }),
  ])

  const kpis = calculateKpiMetrics(allAPs, prevTotal, prevCompleted)

  // ─── 2. Kinerja per Divisi ─────────────────────────────────────
  const divisionWhere = buildDivisionWhere(user, hasDivisionFilter, divisionParam)

  const divisions = await prisma.division.findMany({
    where: divisionWhere,
    include: {
      users: {
        where: { role: 'MANAGER', deletedAt: null },
        select: { name: true },
        take: 1,
      },
      actionPlans: {
        where: { deletedAt: null, ...overlapsPeriod(start, end) },
        select: { status: true, endDate: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const divisionDistribution = divisions.map((div) => {
    const aps = div.actionPlans
    const total = aps.length
    const done = aps.filter((ap) => ap.status === 'COMPLETE').length
    const overdue = aps.filter((ap) => ap.status === 'OVERDUE').length
    const completionPct = total > 0 ? Math.round((done / total) * 100) : 0
    const overdueRatio = total > 0 ? overdue / total : 0
    const governanceIndex = calculateGovernanceIndex(completionPct, overdueRatio)

    return {
      id: div.id,
      name: div.name,
      head: div.users[0]?.name ?? null,
      totalAPs: total,
      completedAPs: done,
      overdueAPs: overdue,
      completionPct,
      governanceIndex,
    }
  })

  // ─── 3. Analisis Hambatan ──────────────────────────────────────
  const bottlenecks = calculateBottlenecks(
    kpis.pendingSignOffAPs,
    kpis.evidenceRequiredAPs,
    kpis.rejectedAPs,
    kpis.overdueAPs
  )

  // ─── 4. Nama perusahaan ────────────────────────────────────────
  const company =
    user.role === 'SUPER_ADMIN' || !user.companyId
      ? null
      : await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { name: true },
        })

  // ─── 5. Pilihan divisi untuk dropdown filter ───────────────────
  const fullDivisionWhere: Record<string, unknown> = { deletedAt: null }
  if (user.role === 'ADMIN_OPERATIONAL') fullDivisionWhere.companyId = user.companyId!
  else if (user.role === 'MANAGER' && user.divisionId) fullDivisionWhere.id = user.divisionId

  const filterDivisions =
    hasDivisionFilter
      ? await prisma.division.findMany({
          where: fullDivisionWhere,
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : divisions.map((d) => ({ id: d.id, name: d.name }))

  const divisionList = filterDivisions.map((d) => ({ id: d.id, name: d.name }))

  // ─── 6. Kuartal yang tersedia ──────────────────────────────────
  const availableQuarters = generateAvailableQuarters(qNum, qYear)

  // Audit log ringan untuk pembacaan laporan eksekutif
  await logActivity({
    userId: user.id,
    action: 'UPDATED',
    oldValue: null,
    newValue: `Akses laporan kinerja periode ${quarterLabel} (filter divisi: ${divisionParam ?? 'ALL'})`,
  })

  return NextResponse.json({
    meta: {
      quarter: quarterLabel,
      quarterLabel: label,
      divisionFilter: divisionParam ?? 'ALL',
      generatedAt: new Date().toISOString(),
      companyName: user.role === 'SUPER_ADMIN' ? 'Semua Perusahaan' : (company?.name ?? null),
    },
    kpi: {
      goalRealization: {
        value: kpis.goalRealization,
        completed: kpis.completedAPs,
        total: kpis.totalAPs,
        unit: '%',
        trend: kpis.realizationTrend,
        prevQuarter: prevQuarter.shortLabel,
        status: kpis.goalRealization >= 80 ? 'ON_TRACK' : kpis.goalRealization >= 60 ? 'AT_RISK' : 'CRITICAL',
      },
      resolutionSLA: {
        value: kpis.avgResolutionDays,
        unit: 'hari',
      },
      evidenceCompliance: {
        value: kpis.evidenceCompliance,
        audited: kpis.evidencedAPs,
        total: kpis.totalAPs,
        pendingSignOff: kpis.pendingSignOffAPs,
        unit: '%',
        label: 'memiliki bukti valid',
      },
      overdueRisk: {
        value: kpis.onTimeRate,
        activeOverdue: kpis.overdueAPs,
        unit: '%',
        label: 'tidak terlambat',
      },
    },
    divisionDistribution,
    bottlenecks,
    options: {
      availableQuarters,
      divisionList,
    },
  })
}
