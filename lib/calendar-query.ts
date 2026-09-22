import type { User, Prisma, ActionPlanStatus, Priority } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { apScope } from '@/lib/rbac'

export interface CalendarFilterOptions {
  status?: string | null
  priority?: string | null
  divisionId?: string | null
  picId?: string | null
  projectId?: string | null
}

/**
 * Single source of truth untuk query kalender — scope RBAC (apScope) DAN
 * filter overlap tanggal SELALU digabung di sini. Jangan pernah apply
 * apScope terpisah manual di route — panggil fungsi ini saja.
 *
 * Overlap: AP tampil kalau rentang [startDate, endDate] AP beririsan
 * dengan rentang [from, to] yang diminta (AP.startDate <= to DAN AP.endDate >= from).
 */
export function buildCalendarWhere(
  user: User,
  from: Date,
  to: Date,
  filters?: CalendarFilterOptions
): Prisma.ActionPlanWhereInput {
  const where: Prisma.ActionPlanWhereInput = {
    ...apScope(user),
    deletedAt: null,
    AND: [{ startDate: { lte: to } }, { endDate: { gte: from } }],
  }

  if (filters?.status) {
    const statuses = filters.status.split(',').map((s) => s.trim()).filter(Boolean)
    if (statuses.length === 1) {
      where.status = statuses[0] as ActionPlanStatus
    } else if (statuses.length > 1) {
      where.status = { in: statuses as ActionPlanStatus[] }
    }
  }

  if (filters?.priority) {
    const priorities = filters.priority.split(',').map((p) => p.trim()).filter(Boolean)
    if (priorities.length === 1) {
      where.priority = priorities[0] as Priority
    } else if (priorities.length > 1) {
      where.priority = { in: priorities as Priority[] }
    }
  }

  if (filters?.divisionId) {
    where.divisionId = filters.divisionId
  }

  if (filters?.picId) {
    where.picId = filters.picId
  }

  if (filters?.projectId) {
    if (filters.projectId === 'personal') {
      where.OR = [{ isPersonal: true }, { taskId: null }]
    } else {
      where.task = { projectId: filters.projectId, deletedAt: null }
    }
  }

  return where
}

/**
 * Helper resolusi tanggal untuk parameter pencarian cepat:
 * - dateRange: 'today' | 'week' | 'month' | 'quarter' | 'q1'..'q4'
 * - quarter: '1'..'4' atau 'Q1'..'Q4'
 * - from & to: tanggal eksplisit (ISO string atau YYYY-MM-DD)
 */
export function resolveDateRange(params: {
  from?: string | null
  to?: string | null
  dateRange?: string | null
  quarter?: string | null
  year?: string | number | null
}): { from: Date; to: Date } {
  const now = new Date()
  const targetYear = Number(params.year) || now.getFullYear()

  // 1. Jika ada quarter spesifik (1..4 atau Q1..Q4)
  if (params.quarter) {
    const rawQ = params.quarter.toUpperCase().replace('Q', '')
    const q = Math.min(4, Math.max(1, parseInt(rawQ, 10) || 1))
    const startMonth = (q - 1) * 3
    const from = new Date(targetYear, startMonth, 1, 0, 0, 0, 0)
    const to = new Date(targetYear, startMonth + 3, 0, 23, 59, 59, 999)
    return { from, to }
  }

  // 2. Jika ada dateRange cepat
  if (params.dateRange) {
    const range = params.dateRange.toLowerCase()
    if (range === 'today') {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      return { from, to }
    }

    if (range === 'week') {
      const day = now.getDay()
      const diffToMon = (day + 6) % 7 // Senin = 0
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon, 0, 0, 0, 0)
      const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
      return { from, to }
    }

    if (range === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { from, to }
    }

    if (range === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1
      const startMonth = (currentQuarter - 1) * 3
      const from = new Date(now.getFullYear(), startMonth, 1, 0, 0, 0, 0)
      const to = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999)
      return { from, to }
    }

    if (['q1', 'q2', 'q3', 'q4'].includes(range)) {
      const q = parseInt(range.replace('q', ''), 10)
      const startMonth = (q - 1) * 3
      const from = new Date(targetYear, startMonth, 1, 0, 0, 0, 0)
      const to = new Date(targetYear, startMonth + 3, 0, 23, 59, 59, 999)
      return { from, to }
    }
  }

  // 3. Jika from dan to eksplisit disediakan
  if (params.from && params.to) {
    const from = new Date(params.from)
    const to = new Date(params.to)
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      // Jika to dikirim tanpa jam/menit (misal 2026-09-30), pastikan mencakup hingga akhir hari
      if (params.to.length <= 10) {
        to.setHours(23, 59, 59, 999)
      }
      return { from, to }
    }
  }

  // 4. Default: bulan berjalan
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { from, to }
}

export interface QuarterMetric {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  name: string
  startDate: string
  endDate: string
  total: number
  completed: number
  inProgress: number
  overdue: number
  pendingApproval: number
  evidenceRequired: number
  completionRate: number
}

export interface QuarterlyAggregationResult {
  year: number
  quarters: QuarterMetric[]
  summary: {
    total: number
    completed: number
    overdue: number
    inProgress: number
    completionRate: number
  }
}

/**
 * Agregasi kuartal (Q1–Q4) untuk user terautentikasi sesuai apScope.
 * Menghitung metrik Action Plan per kuartal dalam 1 tahun.
 */
export async function getQuarterlyAggregation(
  user: User,
  year?: number
): Promise<QuarterlyAggregationResult> {
  const targetYear = year || new Date().getFullYear()
  const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0, 0)
  const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999)

  const items = await prisma.actionPlan.findMany({
    where: {
      ...apScope(user),
      deletedAt: null,
      AND: [{ startDate: { lte: endOfYear } }, { endDate: { gte: startOfYear } }],
    },
    select: {
      id: true,
      status: true,
      priority: true,
      startDate: true,
      endDate: true,
    },
  })

  const quarterDefs: Array<{
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    name: string
    start: Date
    end: Date
  }> = [
    {
      quarter: 'Q1',
      name: 'Kuartal 1',
      start: new Date(targetYear, 0, 1, 0, 0, 0, 0),
      end: new Date(targetYear, 2, 31, 23, 59, 59, 999),
    },
    {
      quarter: 'Q2',
      name: 'Kuartal 2',
      start: new Date(targetYear, 3, 1, 0, 0, 0, 0),
      end: new Date(targetYear, 5, 30, 23, 59, 59, 999),
    },
    {
      quarter: 'Q3',
      name: 'Kuartal 3',
      start: new Date(targetYear, 6, 1, 0, 0, 0, 0),
      end: new Date(targetYear, 8, 30, 23, 59, 59, 999),
    },
    {
      quarter: 'Q4',
      name: 'Kuartal 4',
      start: new Date(targetYear, 9, 1, 0, 0, 0, 0),
      end: new Date(targetYear, 11, 31, 23, 59, 59, 999),
    },
  ]

  let grandTotal = 0
  let grandCompleted = 0
  let grandOverdue = 0
  let grandInProgress = 0

  const quarters: QuarterMetric[] = quarterDefs.map(({ quarter, name, start, end }) => {
    // Action Plan beririsan dengan kuartal jika ap.startDate <= end && ap.endDate >= start
    const qItems = items.filter((ap) => ap.startDate <= end && ap.endDate >= start)
    const total = qItems.length
    const completed = qItems.filter(
      (ap) => ap.status === 'COMPLETE' || ap.status === 'APPROVED'
    ).length
    const inProgress = qItems.filter((ap) => ap.status === 'IN_PROGRESS').length
    const overdue = qItems.filter((ap) => ap.status === 'OVERDUE').length
    const pendingApproval = qItems.filter((ap) => ap.status === 'PENDING_APPROVAL').length
    const evidenceRequired = qItems.filter((ap) => ap.status === 'EVIDENCE_REQUIRED').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    grandTotal += total
    grandCompleted += completed
    grandOverdue += overdue
    grandInProgress += inProgress

    return {
      quarter,
      name,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      total,
      completed,
      inProgress,
      overdue,
      pendingApproval,
      evidenceRequired,
      completionRate,
    }
  })

  return {
    year: targetYear,
    quarters,
    summary: {
      total: grandTotal,
      completed: grandCompleted,
      overdue: grandOverdue,
      inProgress: grandInProgress,
      completionRate: grandTotal > 0 ? Math.round((grandCompleted / grandTotal) * 100) : 0,
    },
  }
}
