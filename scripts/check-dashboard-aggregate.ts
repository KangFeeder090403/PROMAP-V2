// Self-check aggregateDashboard — assert-based, tanpa DB, tanpa framework.
// Jalankan: npx tsx scripts/check-dashboard-aggregate.ts
import assert from 'node:assert/strict'
import { aggregateDashboard } from '@/lib/dashboard-aggregate'

// Array kosong -> semua 0, completionRate 0, tidak divide by zero
const empty = aggregateDashboard([])
assert.strictEqual(empty.metrics.total, 0)
assert.strictEqual(empty.metrics.completionRate, 0)
assert.strictEqual(empty.statusBreakdown.length, 8)
assert.strictEqual(empty.priorityBreakdown.length, 3)
assert.strictEqual(empty.picProductivity.length, 0)

// Sample campuran status/priority/pic
const sample = [
  { status: 'COMPLETE', priority: 'HIGH', picId: 'p1', pic: { name: 'Alice' } },
  { status: 'COMPLETE', priority: 'HIGH', picId: 'p1', pic: { name: 'Alice' } },
  { status: 'IN_PROGRESS', priority: 'MEDIUM', picId: 'p1', pic: { name: 'Alice' } },
  { status: 'OVERDUE', priority: 'LOW', picId: 'p2', pic: { name: 'Bob' } },
  { status: 'NOT_STARTED', priority: 'LOW', picId: 'p2', pic: { name: 'Bob' } },
] as const
const result = aggregateDashboard(sample as any)

assert.strictEqual(result.metrics.total, 5)
assert.strictEqual(result.metrics.complete, 2)
assert.strictEqual(result.metrics.inProgress, 1)
assert.strictEqual(result.metrics.overdue, 1)
assert.strictEqual(result.metrics.completionRate, 40)

const statusComplete = result.statusBreakdown.find((s) => s.status === 'COMPLETE')
assert.strictEqual(statusComplete?.count, 2)
const statusApproved = result.statusBreakdown.find((s) => s.status === 'APPROVED')
assert.strictEqual(statusApproved?.count, 0) // status 0 tetap muncul

const priorityHigh = result.priorityBreakdown.find((p) => p.priority === 'HIGH')
assert.strictEqual(priorityHigh?.count, 2)
const priorityLow = result.priorityBreakdown.find((p) => p.priority === 'LOW')
assert.strictEqual(priorityLow?.count, 2)

// PIC productivity: Alice 2/3=66.67%, Bob 0/2=0%, sort desc
assert.strictEqual(result.picProductivity.length, 2)
assert.strictEqual(result.picProductivity[0].picId, 'p1')
assert.strictEqual(result.picProductivity[0].total, 3)
assert.strictEqual(result.picProductivity[0].complete, 2)
assert.ok(Math.abs(result.picProductivity[0].completionRate - (200 / 3)) < 0.01)
assert.strictEqual(result.picProductivity[1].picId, 'p2')
assert.strictEqual(result.picProductivity[1].completionRate, 0)

console.log('OK — aggregateDashboard assertions passed')
