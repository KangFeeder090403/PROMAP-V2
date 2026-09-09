import type { ActionPlanStatus, Priority, ProposalStatus } from '@/lib/generated/prisma/client'
import type {
  ActionRequiredItem,
  DashboardResponse,
  OverdueRow,
  PicWorkload,
} from '@/lib/types/dashboard'

const ALL_STATUSES: ActionPlanStatus[] = [
  'NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'EVIDENCE_REQUIRED',
  'APPROVED', 'REJECTED', 'OVERDUE', 'COMPLETE',
]
const ALL_PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW']

/** Kandidat overdue yang dikirim ke client; client sortir ulang lalu tampilkan 10 teratas. */
export const OVERDUE_CANDIDATES = 100

const RISK_BY_PRIORITY: Record<Priority, OverdueRow['risk']> = {
  HIGH: 'CRITICAL',
  MEDIUM: 'HIGH',
  LOW: 'MEDIUM',
}

export type APRow = {
  status: ActionPlanStatus
  priority: Priority
  picId: string
  pic: { name: string }
  id?: string
  title?: string
  outcomeKpi?: string | null
  evidenceLink?: string | null
  endDate?: Date | null
  createdAt?: Date | null
}

export type ProposalRow = {
  id: string
  title: string
  description?: string | null
  status: ProposalStatus
  proposerName: string
  createdAt: Date
}

/** RefCode ringkas tanpa kolom dedicated: AP-XXXXXX / PR-XXXXXX dari 6 sufiks id. */
export function shortRef(id: string, prefix: string) {
  return `${prefix}-${id.slice(-6).toUpperCase()}`
}

function actionRank(item: ActionRequiredItem) {
  if (item.status === 'PENDING_APPROVAL') return 0
  if (item.status === 'EVIDENCE_REQUIRED') return 1
  return 2
}

function riskRank(r: OverdueRow['risk']) {
  return r === 'CRITICAL' ? 0 : r === 'HIGH' ? 1 : 2
}

/** Pure aggregation — testable tanpa DB (lihat scripts/check-dashboard-aggregate.ts). */
export function aggregateDashboard(
  actionPlans: APRow[],
  proposals: ProposalRow[] = []
): DashboardResponse {
  const total = actionPlans.length
  const complete = actionPlans.filter((ap) => ap.status === 'COMPLETE').length
  const inProgress = actionPlans.filter((ap) => ap.status === 'IN_PROGRESS').length
  const inReview = actionPlans.filter((ap) => ap.status === 'PENDING_APPROVAL').length
  const overdue = actionPlans.filter((ap) => ap.status === 'OVERDUE').length

  const statusBreakdown = ALL_STATUSES.map((status) => ({
    status,
    count: actionPlans.filter((ap) => ap.status === status).length,
  }))

  const priorityBreakdown = ALL_PRIORITIES.map((priority) => ({
    priority,
    count: actionPlans.filter((ap) => ap.priority === priority).length,
  }))

  const picMap = new Map<string, { picName: string; total: number; complete: number }>()
  for (const ap of actionPlans) {
    const entry = picMap.get(ap.picId) ?? { picName: ap.pic.name, total: 0, complete: 0 }
    entry.total += 1
    if (ap.status === 'COMPLETE') entry.complete += 1
    picMap.set(ap.picId, entry)
  }
  const picProductivity = Array.from(picMap.entries())
    .map(([picId, v]) => ({
      picId,
      picName: v.picName,
      total: v.total,
      complete: v.complete,
      completionRate: v.total > 0 ? (v.complete / v.total) * 100 : 0,
    }))
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 10)

  // Workload per PIC: overdue / active / review / done
  const workloadMap = new Map<string, PicWorkload>()
  for (const ap of actionPlans) {
    const entry =
      workloadMap.get(ap.picId) ??
      ({ picId: ap.picId, picName: ap.pic.name, total: 0, overdue: 0, active: 0, review: 0, done: 0 } as PicWorkload)
    entry.total += 1
    if (ap.status === 'OVERDUE') entry.overdue += 1
    if (ap.status === 'IN_PROGRESS') entry.active += 1
    if (ap.status === 'PENDING_APPROVAL') entry.review += 1
    if (ap.status === 'COMPLETE') entry.done += 1
    workloadMap.set(ap.picId, entry)
  }
  const picWorkload = [...workloadMap.values()].sort((a, b) => {
    const wA = a.overdue * 2 + a.active + a.review
    const wB = b.overdue * 2 + b.active + b.review
    return wB - wA
  })

  // Action Required — AP butuh keputusan Manager + proposal diajukan
  const apActionRequired: ActionRequiredItem[] = actionPlans
    .filter((ap) => (ap.status === 'PENDING_APPROVAL' || ap.status === 'EVIDENCE_REQUIRED') && ap.id && ap.title)
    .map((ap) => ({
      id: ap.id!,
      refCode: shortRef(ap.id!, 'AP'),
      kind: 'AP' as const,
      title: ap.title!,
      status: ap.status,
      picName: ap.pic.name,
      evidenceLink: ap.evidenceLink ?? null,
      deadline: ap.endDate ? ap.endDate.toISOString() : null,
      createdAt: ap.createdAt ? ap.createdAt.toISOString() : null,
    }))

  const proposalItems: ActionRequiredItem[] = proposals.map((p) => ({
    id: p.id,
    refCode: shortRef(p.id, 'PR'),
    kind: 'PROPOSAL' as const,
    title: p.title,
    description: p.description ?? null,
    status: p.status,
    picName: p.proposerName,
    evidenceLink: null,
    // Proposal tidak punya tenggat — pakai createdAt sebagai tanggal pengajuan.
    deadline: null,
    createdAt: p.createdAt.toISOString(),
  }))

  const actionRequired = [...apActionRequired, ...proposalItems].sort(
    (a, b) => actionRank(a) - actionRank(b)
  )

  // Overdue & Critical — hanya baris lengkap (id/title/endDate)
  const overdueList: OverdueRow[] = actionPlans
    .filter((ap) => ap.status === 'OVERDUE' && ap.id && ap.title && ap.endDate)
    .map((ap) => ({
      id: ap.id!,
      refCode: shortRef(ap.id!, 'AP'),
      title: ap.title!,
      subtitle: ap.outcomeKpi ?? null,
      risk: RISK_BY_PRIORITY[ap.priority],
      picId: ap.picId,
      picName: ap.pic.name,
      deadline: ap.endDate!.toISOString(),
      createdAt: ap.createdAt ? ap.createdAt.toISOString() : null,
      lateDays: Math.max(0, Math.ceil((Date.now() - ap.endDate!.getTime()) / 86_400_000)),
    }))
    .sort((a, b) => b.lateDays - a.lateDays || riskRank(a.risk) - riskRank(b.risk))
    // 100 kandidat, bukan 10: client menyortir ulang (prioritas/tenggat/createdAt) lalu
    // menampilkan 10 teratas. Kalau dipotong 10 di sini, AP prioritas HIGH yang baru
    // telat beberapa hari tidak akan pernah masuk kandidat sort.
    .slice(0, OVERDUE_CANDIDATES)

  return {
    metrics: {
      total,
      complete,
      completionRate: total > 0 ? (complete / total) * 100 : 0,
      inProgress,
      inReview,
      overdue,
    },
    statusBreakdown,
    priorityBreakdown,
    picProductivity,
    picWorkload,
    actionRequired,
    overdueList,
  }
}