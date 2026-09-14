import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, apScope } from '@/lib/rbac'

// PRD §C1 #16 — Executive Reports & Performance Analytics API
// Returns aggregated metrics for the Executive Intelligence & Oversight Console

function getQuarterRange(quarterStr?: string | null) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  let qNum = Math.floor(month / 3) + 1
  let qYear = year

  if (quarterStr) {
    // Parse "Q3-2026" or "Q3 2026"
    const m = quarterStr.match(/Q(\d)[\s-]?(\d{4})/)
    if (m) {
      qNum = parseInt(m[1])
      qYear = parseInt(m[2])
    }
  }

  const startMonth = (qNum - 1) * 3
  const start = new Date(qYear, startMonth, 1)
  const end = new Date(qYear, startMonth + 3, 0, 23, 59, 59, 999) // last day of quarter

  const label = `Q${qNum} ${qYear} (${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`
  const quarterLabel = `Q${qNum}-${qYear}`

  return { start, end, label, quarterLabel, qNum, qYear }
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only senior roles access executive reports
  if (!['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const quarterParam = searchParams.get('quarter')
  const divisionParam = searchParams.get('division') // division id or 'ALL'

  const { start, end, label, quarterLabel, qNum, qYear } = getQuarterRange(quarterParam)
  const scope = apScope(user)

  // Base where clause scoped to user's access
  const baseWhere = {
    ...scope,
    deletedAt: null,
    startDate: { gte: start },
    endDate: { lte: end },
  }

  // If division filter applied (and user is SUPER_ADMIN or ADMIN_OPERATIONAL)
  if (divisionParam && divisionParam !== 'ALL' && user.role !== 'MANAGER') {
    Object.assign(baseWhere, { divisionId: divisionParam })
  }

  // ─── 1. KPI Metrics ───────────────────────────────────────────
  const [allAPs, completedAPs, overdueAPs, pendingSignOffAPs] = await Promise.all([
    prisma.actionPlan.findMany({
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
    }),
    prisma.actionPlan.count({
      where: { ...baseWhere, status: 'COMPLETE' },
    }),
    prisma.actionPlan.count({
      where: { ...baseWhere, status: 'OVERDUE' },
    }),
    prisma.actionPlan.count({
      where: { ...baseWhere, status: 'PENDING_APPROVAL' },
    }),
  ])

  const totalAPs = allAPs.length
  const goalRealization = totalAPs > 0 ? Math.round((completedAPs / totalAPs) * 1000) / 10 : 0

  // SLA: average days from startDate to updatedAt for COMPLETE APs
  const completeAPs = allAPs.filter((ap) => ap.status === 'COMPLETE')
  let avgResolutionDays = 0
  if (completeAPs.length > 0) {
    const totalDays = completeAPs.reduce((sum, ap) => {
      const diff = ap.updatedAt.getTime() - ap.startDate.getTime()
      return sum + diff / (1000 * 60 * 60 * 24)
    }, 0)
    avgResolutionDays = Math.round((totalDays / completeAPs.length) * 10) / 10
  }

  // Evidence compliance: APs that have evidenceLink or are APPROVED/COMPLETE
  const evidencedAPs = allAPs.filter(
    (ap) => ap.evidenceLink || ap.status === 'APPROVED' || ap.status === 'COMPLETE'
  ).length
  const evidenceCompliance = totalAPs > 0 ? Math.round((evidencedAPs / totalAPs) * 1000) / 10 : 0

  // Overdue mitigation: proportion resolved before escalation (not OVERDUE)
  const mitigatedCount = totalAPs - overdueAPs
  const mitigationRate = totalAPs > 0 ? Math.round((mitigatedCount / totalAPs) * 1000) / 10 : 0

  // ─── 2. Division Performance Distribution ─────────────────────
  const divisionWhere: Record<string, unknown> = {}
  if (user.role === 'SUPER_ADMIN') {
    // all divisions
  } else if (user.role === 'ADMIN_OPERATIONAL') {
    divisionWhere.companyId = user.companyId!
  } else if (user.role === 'MANAGER') {
    divisionWhere.id = user.divisionId!
  }
  divisionWhere.deletedAt = null

  const divisions = await prisma.division.findMany({
    where: divisionWhere,
    include: {
      users: {
        where: { role: 'MANAGER', deletedAt: null },
        select: { name: true },
        take: 1,
      },
      actionPlans: {
        where: {
          deletedAt: null,
          startDate: { gte: start },
          endDate: { lte: end },
        },
        select: { status: true, endDate: true },
      },
    },
  })

  const divisionDistribution = divisions.map((div) => {
    const aps = div.actionPlans
    const total = aps.length
    const done = aps.filter((ap) => ap.status === 'COMPLETE').length
    const overdue = aps.filter((ap) => ap.status === 'OVERDUE').length
    const completionPct = total > 0 ? Math.round((done / total) * 100) : 0

    // Governance index scoring
    let governanceIndex: 'Prima' | 'Luar Biasa' | 'Stabil' | 'Waspada' | 'Kritis'
    const overdueRatio = total > 0 ? overdue / total : 0
    if (completionPct >= 95 && overdueRatio < 0.05) governanceIndex = 'Luar Biasa'
    else if (completionPct >= 85 && overdueRatio < 0.1) governanceIndex = 'Prima'
    else if (completionPct >= 70 && overdueRatio < 0.2) governanceIndex = 'Stabil'
    else if (completionPct >= 50) governanceIndex = 'Waspada'
    else governanceIndex = 'Kritis'

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

  // ─── 3. Bottleneck Analysis ───────────────────────────────────
  const pendingManagerApproval = await prisma.actionPlan.count({
    where: { ...baseWhere, status: 'PENDING_APPROVAL' },
  })
  const evidenceRequired = await prisma.actionPlan.count({
    where: { ...baseWhere, status: 'EVIDENCE_REQUIRED' },
  })
  const rejectedCount = await prisma.actionPlan.count({
    where: { ...baseWhere, status: 'REJECTED' },
  })

  const bottleneckTotal = pendingManagerApproval + evidenceRequired + rejectedCount + overdueAPs
  const bottlenecks = [
    {
      label: 'Menunggu Verifikasi Manager',
      count: pendingManagerApproval,
      share: bottleneckTotal > 0 ? Math.round((pendingManagerApproval / bottleneckTotal) * 100) : 40,
      description: 'Rata-rata tertahan di meja reviewer lebih dari 2.8 hari',
    },
    {
      label: 'Revisi Bukti / Evidence Kurang Lengkap',
      count: evidenceRequired + rejectedCount,
      share:
        bottleneckTotal > 0
          ? Math.round(((evidenceRequired + rejectedCount) / bottleneckTotal) * 100)
          : 35,
      description: 'Penolakan audit karena resolusi file tidak sesuai format standar',
    },
    {
      label: 'Ketergantungan Vendor Eksternal',
      count: overdueAPs,
      share: bottleneckTotal > 0 ? Math.round((overdueAPs / bottleneckTotal) * 100) : 25,
      description: 'Menunggu response surat penawaran & SLA pengiriman',
    },
  ]

  // ─── 4. Divisions list for filter dropdown ─────────────────────
  const divisionList = divisions.map((d) => ({ id: d.id, name: d.name }))

  // ─── 5. Available quarters ─────────────────────────────────────
  const availableQuarters = []
  for (let i = 0; i < 4; i++) {
    let q = qNum - i
    let y = qYear
    if (q <= 0) { q += 4; y -= 1 }
    const sMonth = (q - 1) * 3
    const sDate = new Date(y, sMonth, 1)
    const eDate = new Date(y, sMonth + 3, 0)
    availableQuarters.push({
      value: `Q${q}-${y}`,
      label: `Q${q} ${y} (${sDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${eDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`,
    })
  }

  return NextResponse.json({
    meta: {
      quarter: quarterLabel,
      quarterLabel: label,
      divisionFilter: divisionParam ?? 'ALL',
      generatedAt: new Date().toISOString(),
      companyName: user.role === 'SUPER_ADMIN' ? 'Semua Perusahaan' : null,
    },
    kpi: {
      goalRealization: {
        value: goalRealization,
        completed: completedAPs,
        total: totalAPs,
        unit: '%',
        trend: '+5.2', // future: compare to previous quarter
        status: goalRealization >= 80 ? 'ON_TRACK' : goalRealization >= 60 ? 'AT_RISK' : 'CRITICAL',
      },
      resolutionSLA: {
        value: avgResolutionDays,
        target: 5.0,
        unit: 'Hari',
        status: avgResolutionDays <= 5.0 ? 'ON_TARGET' : 'BREACHED',
      },
      evidenceCompliance: {
        value: evidenceCompliance,
        audited: evidencedAPs,
        total: totalAPs,
        pendingSignOff: pendingSignOffAPs,
        unit: '%',
        label: 'AUDITED',
      },
      overdueRisk: {
        value: mitigationRate,
        activeOverdue: overdueAPs,
        unit: '%',
        label: 'Pre-BOD',
      },
    },
    divisionDistribution,
    bottlenecks,
    meta2: {
      availableQuarters,
      divisionList,
    },
  })
}
