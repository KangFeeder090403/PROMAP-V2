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

// Tanpa data COMPLETE -> onTimeRate null (bukan 0), tracker kosong
assert.strictEqual(empty.metrics.onTimeRate, null)
assert.deepStrictEqual(empty.tracker, [])

// Tepat waktu: selesai di hari tenggat (WIB) = tepat waktu; besoknya = telat
const deadline = new Date('2026-10-10T10:00:00Z') // 17:00 WIB, 10 Okt
const base = { priority: 'HIGH', picId: 'p1', pic: { name: 'A' }, title: 'x', endDate: deadline } as const
const onTime = aggregateDashboard(
  [
    { ...base, id: 'a1', status: 'COMPLETE' }, // log 23:30 WIB hari tenggat
    { ...base, id: 'a2', status: 'COMPLETE', updatedAt: new Date('2026-10-10T17:30:00Z') }, // 00:30 WIB 11 Okt
    { ...base, id: 'a3', status: 'COMPLETE' }, // tanpa tanggal selesai -> tak dihitung
  ],
  [],
  new Map([['a1', new Date('2026-10-10T16:30:00Z')]])
)
assert.strictEqual(onTime.metrics.onTimeRate, 50)
assert.deepStrictEqual(onTime.metrics.onTimeBasis, { total: 2, fromLog: 1, fromUpdatedAt: 1 })

// Tracker: non-COMPLETE, OVERDUE dulu lalu endDate asc, cap 50
const many = Array.from({ length: 60 }, (_, i) => ({
  ...base,
  id: `t${i}`,
  status: i === 59 ? 'OVERDUE' : i === 0 ? 'COMPLETE' : 'IN_PROGRESS',
  endDate: new Date(Date.UTC(2026, 9, 1 + (60 - i))),
  checklistDone: 1,
  checklistTotal: 2,
})) as any
const tr = aggregateDashboard(many).tracker!
assert.strictEqual(tr.length, 50)
assert.strictEqual(tr[0].id, 't59')
assert.ok(tr.every((r) => r.status !== 'COMPLETE'))
for (let i = 2; i < tr.length; i++) assert.ok(+new Date(tr[i - 1].deadline!) <= +new Date(tr[i].deadline!))
assert.strictEqual(tr[1].checklistTotal, 2)

console.log('OK — aggregateDashboard assertions passed')
