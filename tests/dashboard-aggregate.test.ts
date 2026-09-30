import { describe, it, expect } from 'vitest'
import {
  aggregateDashboard,
  shortRef,
  type APRow,
  type ProposalRow,
  OVERDUE_CANDIDATES,
} from '@/lib/dashboard-aggregate'

describe('lib/dashboard-aggregate.ts', () => {
  describe('shortRef()', () => {
    it('generates short ref code from last 6 characters of id', () => {
      expect(shortRef('clh1234567890abcdef', 'AP')).toBe('AP-ABCDEF')
      expect(shortRef('123456', 'PR')).toBe('PR-123456')
      expect(shortRef('short', 'AP')).toBe('AP-SHORT')
    })
  })

  describe('aggregateDashboard()', () => {
    it('returns empty/zero metrics when passed empty arrays', () => {
      const result = aggregateDashboard([], [])

      expect(result.metrics).toEqual({
        total: 0,
        complete: 0,
        completionRate: 0,
        inProgress: 0,
        inReview: 0,
        overdue: 0,
      })
      expect(result.statusBreakdown.length).toBe(8)
      expect(result.statusBreakdown.every((s) => s.count === 0)).toBe(true)
      expect(result.priorityBreakdown.length).toBe(3)
      expect(result.priorityBreakdown.every((p) => p.count === 0)).toBe(true)
      expect(result.picProductivity).toEqual([])
      expect(result.picWorkload).toEqual([])
      expect(result.actionRequired).toEqual([])
      expect(result.overdueList).toEqual([])
    })

    it('aggregates metrics, breakdown, and productivity correctly', () => {
      const sampleAps: APRow[] = [
        {
          id: 'ap-1',
          title: 'AP One',
          status: 'COMPLETE',
          priority: 'HIGH',
          picId: 'pic-1',
          pic: { name: 'Alice' },
          endDate: new Date('2026-02-01'),
          createdAt: new Date('2026-01-01'),
        },
        {
          id: 'ap-2',
          title: 'AP Two',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          picId: 'pic-1',
          pic: { name: 'Alice' },
          endDate: new Date('2026-02-02'),
          createdAt: new Date('2026-01-02'),
        },
        {
          id: 'ap-3',
          title: 'AP Three',
          status: 'PENDING_APPROVAL',
          priority: 'MEDIUM',
          picId: 'pic-2',
          pic: { name: 'Bob' },
          endDate: new Date('2026-02-03'),
          createdAt: new Date('2026-01-03'),
          evidenceLink: 'https://drive.google.com/test',
        },
        {
          id: 'ap-4',
          title: 'AP Four',
          status: 'OVERDUE',
          priority: 'HIGH',
          picId: 'pic-2',
          pic: { name: 'Bob' },
          endDate: new Date('2026-01-10'),
          createdAt: new Date('2026-01-01'),
        },
      ]

      const sampleProposals: ProposalRow[] = [
        {
          id: 'prop-1',
          title: 'Proposal Alpha',
          description: 'A test proposal',
          status: 'SUBMITTED',
          proposerName: 'Charlie',
          createdAt: new Date('2026-01-05'),
        },
      ]

      const result = aggregateDashboard(sampleAps, sampleProposals)

      // Metrics
      expect(result.metrics.total).toBe(4)
      expect(result.metrics.complete).toBe(1)
      expect(result.metrics.inProgress).toBe(1)
      expect(result.metrics.inReview).toBe(1)
      expect(result.metrics.overdue).toBe(1)
      expect(result.metrics.completionRate).toBe(25)

      // Priority Breakdown
      const highPriority = result.priorityBreakdown.find((p) => p.priority === 'HIGH')
      const medPriority = result.priorityBreakdown.find((p) => p.priority === 'MEDIUM')
      const lowPriority = result.priorityBreakdown.find((p) => p.priority === 'LOW')
      expect(highPriority?.count).toBe(3)
      expect(medPriority?.count).toBe(1)
      expect(lowPriority?.count).toBe(0)

      // PIC Productivity (Alice has 1/2 complete = 50%, Bob has 0/2 complete = 0%)
      expect(result.picProductivity.length).toBe(2)
      expect(result.picProductivity[0].picName).toBe('Alice')
      expect(result.picProductivity[0].completionRate).toBe(50)
      expect(result.picProductivity[1].picName).toBe('Bob')
      expect(result.picProductivity[1].completionRate).toBe(0)

      // PIC Workload: Bob has 1 overdue * 2 + 1 review = 3; Alice has 1 active = 1
      expect(result.picWorkload[0].picName).toBe('Bob')
      expect(result.picWorkload[0].overdue).toBe(1)
      expect(result.picWorkload[0].review).toBe(1)

      // Action Required: AP-3 (PENDING_APPROVAL) + Proposal-1
      expect(result.actionRequired.length).toBe(2)
      expect(result.actionRequired.some((item) => item.kind === 'AP' && item.title === 'AP Three')).toBe(true)
      expect(result.actionRequired.some((item) => item.kind === 'PROPOSAL' && item.title === 'Proposal Alpha')).toBe(true)

      // Overdue List: AP-4
      expect(result.overdueList.length).toBe(1)
      expect(result.overdueList[0].id).toBe('ap-4')
      expect(result.overdueList[0].risk).toBe('CRITICAL') // HIGH priority maps to CRITICAL risk
      expect(result.overdueList[0].lateDays).toBeGreaterThan(0)
    })

    it('limits overdueList to OVERDUE_CANDIDATES', () => {
      const overdueItems: APRow[] = Array.from({ length: 120 }, (_, i) => ({
        id: `ap-overdue-${i}`,
        title: `Overdue AP ${i}`,
        status: 'OVERDUE',
        priority: 'MEDIUM',
        picId: 'pic-test',
        pic: { name: 'Tester' },
        endDate: new Date(Date.now() - 86400000 * (i + 1)),
      }))

      const result = aggregateDashboard(overdueItems)
      expect(result.overdueList.length).toBe(OVERDUE_CANDIDATES)
    })
  })
})
