import assert from 'node:assert/strict'
import 'dotenv/config'
import {
  buildCalendarWhere,
  resolveDateRange,
  getQuarterlyAggregation,
} from '../lib/calendar-query'
import type { User } from '../lib/generated/prisma/client'
import { prisma } from '../lib/prisma'

function mockUser(overrides: Partial<User>): User {
  return {
    id: 'u-1',
    companyId: 'company-1',
    divisionId: 'division-1',
    role: 'ADMIN_OPERATIONAL',
    name: 'Admin Ops',
    ...overrides,
  } as User
}

async function runChecks() {
  console.log('Running Calendar API & Query Checks...')

  const user = mockUser({})
  const from = new Date(2026, 8, 1) // 1 Sep 2026
  const to = new Date(2026, 8, 30) // 30 Sep 2026

  // 1. Check buildCalendarWhere default
  const where1 = buildCalendarWhere(user, from, to)
  assert.strictEqual(where1.companyId, 'company-1')
  assert.strictEqual(where1.deletedAt, null)
  assert.ok(Array.isArray(where1.AND))

  // 2. Check buildCalendarWhere with status, priority, picId, projectId
  const where2 = buildCalendarWhere(user, from, to, {
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    picId: 'pic-123',
    projectId: 'proj-456',
  })
  assert.strictEqual(where2.status, 'IN_PROGRESS')
  assert.strictEqual(where2.priority, 'HIGH')
  assert.strictEqual(where2.picId, 'pic-123')
  assert.deepStrictEqual(where2.task, { projectId: 'proj-456', deletedAt: null })

  // 3. Check personal project filter
  const wherePersonal = buildCalendarWhere(user, from, to, {
    projectId: 'personal',
  })
  assert.deepStrictEqual(wherePersonal.OR, [{ isPersonal: true }, { taskId: null }])

  // 4. Check resolveDateRange for 'today'
  const todayRange = resolveDateRange({ dateRange: 'today' })
  const now = new Date()
  assert.strictEqual(todayRange.from.getDate(), now.getDate())
  assert.strictEqual(todayRange.to.getDate(), now.getDate())
  assert.strictEqual(todayRange.from.getHours(), 0)
  assert.strictEqual(todayRange.to.getHours(), 23)

  // 5. Check resolveDateRange for 'q3'
  const q3Range = resolveDateRange({ quarter: 'Q3', year: 2026 })
  assert.strictEqual(q3Range.from.getFullYear(), 2026)
  assert.strictEqual(q3Range.from.getMonth(), 6) // July = 6
  assert.strictEqual(q3Range.from.getDate(), 1)
  assert.strictEqual(q3Range.to.getMonth(), 8) // September = 8
  assert.strictEqual(q3Range.to.getDate(), 30)

  // 6. Check resolveDateRange for 'q1'..'q4'
  const q1Range = resolveDateRange({ dateRange: 'q1', year: 2026 })
  assert.strictEqual(q1Range.from.getMonth(), 0) // January
  assert.strictEqual(q1Range.to.getMonth(), 2) // March
  assert.strictEqual(q1Range.to.getDate(), 31)

  // 7. Check quarterly aggregation function against real DB
  const realUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  const testUser = realUser ?? user

  const aggResult = await getQuarterlyAggregation(testUser, 2026)
  assert.strictEqual(aggResult.year, 2026)
  assert.strictEqual(aggResult.quarters.length, 4)
  assert.strictEqual(aggResult.quarters[0].quarter, 'Q1')
  assert.strictEqual(aggResult.quarters[1].quarter, 'Q2')
  assert.strictEqual(aggResult.quarters[2].quarter, 'Q3')
  assert.strictEqual(aggResult.quarters[3].quarter, 'Q4')
  assert.ok(typeof aggResult.summary.total === 'number')
  assert.ok(typeof aggResult.summary.completionRate === 'number')

  console.log('✅ All Calendar API & Query assertions passed successfully!')
  console.log(`Aggregated quarters for 2026 (User: ${testUser.name} [${testUser.role}]): Total=${aggResult.summary.total}, Completed=${aggResult.summary.completed}, Rate=${aggResult.summary.completionRate}%`)
  aggResult.quarters.forEach((q) => {
    console.log(`  - ${q.quarter} (${q.name}): ${q.total} total plans, ${q.completed} done, ${q.completionRate}% completion`)
  })
}

runChecks().catch((err) => {
  console.error('❌ Calendar check failed:', err)
  process.exit(1)
})
