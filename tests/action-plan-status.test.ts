import { describe, it, expect } from 'vitest'
import {
  STATUS_TRANSITIONS,
  canTransition,
  columnForStatus,
  resolveKanbanDrop,
  canDragKanbanCard,
  KANBAN_COLUMNS,
} from '@/lib/action-plan-status'

describe('lib/action-plan-status.ts', () => {
  describe('STATUS_TRANSITIONS', () => {
    it('defines valid forward transitions according to business rules', () => {
      expect(STATUS_TRANSITIONS.NOT_STARTED).toEqual(['IN_PROGRESS'])
      expect(STATUS_TRANSITIONS.IN_PROGRESS).toEqual(['PENDING_APPROVAL', 'OVERDUE'])
      expect(STATUS_TRANSITIONS.PENDING_APPROVAL).toEqual(['COMPLETE', 'REJECTED', 'EVIDENCE_REQUIRED'])
      expect(STATUS_TRANSITIONS.EVIDENCE_REQUIRED).toEqual(['PENDING_APPROVAL'])
      expect(STATUS_TRANSITIONS.REJECTED).toEqual(['IN_PROGRESS'])
      expect(STATUS_TRANSITIONS.OVERDUE).toEqual(['IN_PROGRESS', 'PENDING_APPROVAL'])
      expect(STATUS_TRANSITIONS.APPROVED).toEqual([])
      expect(STATUS_TRANSITIONS.COMPLETE).toEqual([])
    })
  })

  describe('canTransition()', () => {
    it('returns true for allowed status transitions', () => {
      expect(canTransition('NOT_STARTED', 'IN_PROGRESS')).toBe(true)
      expect(canTransition('IN_PROGRESS', 'PENDING_APPROVAL')).toBe(true)
      expect(canTransition('IN_PROGRESS', 'OVERDUE')).toBe(true)
      expect(canTransition('PENDING_APPROVAL', 'COMPLETE')).toBe(true)
      expect(canTransition('PENDING_APPROVAL', 'REJECTED')).toBe(true)
      expect(canTransition('PENDING_APPROVAL', 'EVIDENCE_REQUIRED')).toBe(true)
      expect(canTransition('EVIDENCE_REQUIRED', 'PENDING_APPROVAL')).toBe(true)
      expect(canTransition('REJECTED', 'IN_PROGRESS')).toBe(true)
      expect(canTransition('OVERDUE', 'IN_PROGRESS')).toBe(true)
      expect(canTransition('OVERDUE', 'PENDING_APPROVAL')).toBe(true)
    })

    it('returns false for forbidden or terminal status transitions', () => {
      expect(canTransition('NOT_STARTED', 'COMPLETE')).toBe(false)
      expect(canTransition('NOT_STARTED', 'PENDING_APPROVAL')).toBe(false)
      expect(canTransition('COMPLETE', 'IN_PROGRESS')).toBe(false)
      expect(canTransition('COMPLETE', 'NOT_STARTED')).toBe(false)
      expect(canTransition('APPROVED', 'COMPLETE')).toBe(false)
    })
  })

  describe('columnForStatus()', () => {
    it('correctly maps 8 business statuses to 5 Kanban columns', () => {
      expect(columnForStatus('NOT_STARTED')).toBe('NOT_STARTED')
      expect(columnForStatus('IN_PROGRESS')).toBe('IN_PROGRESS')
      expect(columnForStatus('OVERDUE')).toBe('IN_PROGRESS') // Overdue is part of Dikerjakan with badge
      expect(columnForStatus('PENDING_APPROVAL')).toBe('REVIEW')
      expect(columnForStatus('EVIDENCE_REQUIRED')).toBe('REVIEW')
      expect(columnForStatus('REJECTED')).toBe('NEEDS_REVISION')
      expect(columnForStatus('APPROVED')).toBe('DONE')
      expect(columnForStatus('COMPLETE')).toBe('DONE')
      expect(columnForStatus('UNKNOWN_STATUS')).toBe('NOT_STARTED')
    })

    it('has 5 distinct kanban columns', () => {
      expect(KANBAN_COLUMNS.length).toBe(5)
      const columnKeys = KANBAN_COLUMNS.map((c) => c.key)
      expect(columnKeys).toEqual(['NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'NEEDS_REVISION', 'DONE'])
    })
  })

  describe('resolveKanbanDrop()', () => {
    const ownerUser = { id: 'user-owner', role: 'PIC' as const, divisionId: 'div-1' }
    const reviewerManager = { id: 'mgr-1', role: 'MANAGER' as const, divisionId: 'div-1' }
    const otherManager = { id: 'mgr-2', role: 'MANAGER' as const, divisionId: 'div-2' }

    it('returns null if dropping into the same column', () => {
      const ap = { status: 'NOT_STARTED', picId: 'user-owner', divisionId: 'div-1', isPersonal: false, taskId: 't1' }
      expect(resolveKanbanDrop(ap, 'NOT_STARTED', ownerUser)).toBeNull()
    })

    it('allows owner to start AP by dragging to IN_PROGRESS', () => {
      const notStartedAp = { status: 'NOT_STARTED', picId: 'user-owner', divisionId: 'div-1', isPersonal: false, taskId: 't1' }
      expect(resolveKanbanDrop(notStartedAp, 'IN_PROGRESS', ownerUser)).toEqual({ kind: 'start' })

      const rejectedAp = { status: 'REJECTED', picId: 'user-owner', divisionId: 'div-1', isPersonal: false, taskId: 't1' }
      expect(resolveKanbanDrop(rejectedAp, 'IN_PROGRESS', ownerUser)).toEqual({ kind: 'start' })

      // Non-owner cannot start
      expect(resolveKanbanDrop(notStartedAp, 'IN_PROGRESS', reviewerManager)).toBeNull()
    })

    it('returns null when dragging OVERDUE to IN_PROGRESS because it already belongs to IN_PROGRESS column', () => {
      const overdueAp = { status: 'OVERDUE', picId: 'user-owner', divisionId: 'div-1', isPersonal: false, taskId: 't1' }
      expect(resolveKanbanDrop(overdueAp, 'IN_PROGRESS', ownerUser)).toBeNull()
    })

    it('directs non-personal owner to provide note when moving to REVIEW', () => {
      const inProgressAp = { status: 'IN_PROGRESS', picId: 'user-owner', divisionId: 'div-1', isPersonal: false, taskId: 't1' }
      expect(resolveKanbanDrop(inProgressAp, 'REVIEW', ownerUser)).toEqual({ kind: 'needs-note' })

      // Personal AP cannot be moved to review (personal AP doesn't need manager review)
      const personalAp = { status: 'IN_PROGRESS', picId: 'user-owner', divisionId: 'div-1', isPersonal: true, taskId: null }
      expect(resolveKanbanDrop(personalAp, 'REVIEW', ownerUser)).toBeNull()
    })

    it('directs reviewer to provide note when moving to NEEDS_REVISION', () => {
      const reviewAp = { status: 'PENDING_APPROVAL', picId: 'user-owner', divisionId: 'div-1', isPersonal: false, taskId: 't1' }
      expect(resolveKanbanDrop(reviewAp, 'NEEDS_REVISION', reviewerManager)).toEqual({ kind: 'needs-note' })

      // Other manager cannot reject
      expect(resolveKanbanDrop(reviewAp, 'NEEDS_REVISION', otherManager)).toBeNull()
    })

    it('handles DONE drops differently for personal vs delegated AP', () => {
      // Personal AP: owner can complete directly
      const personalAp = { status: 'IN_PROGRESS', picId: 'user-owner', divisionId: 'div-1', isPersonal: true, taskId: null }
      expect(resolveKanbanDrop(personalAp, 'DONE', ownerUser)).toEqual({ kind: 'complete' })

      // Non-personal AP: owner cannot self-approve to DONE
      const delegatedAp = { status: 'PENDING_APPROVAL', picId: 'user-owner', divisionId: 'div-1', isPersonal: false, taskId: 't1' }
      expect(resolveKanbanDrop(delegatedAp, 'DONE', ownerUser)).toBeNull()

      // Non-personal AP: reviewer manager can approve to DONE
      expect(resolveKanbanDrop(delegatedAp, 'DONE', reviewerManager)).toEqual({ kind: 'review-complete' })
    })
  })

  describe('canDragKanbanCard()', () => {
    it('returns true if at least one target column is valid', () => {
      const ownerUser = { id: 'user-owner', role: 'PIC' as const, divisionId: 'div-1' }
      const ap = { status: 'NOT_STARTED', picId: 'user-owner', divisionId: 'div-1', isPersonal: false, taskId: 't1' }
      expect(canDragKanbanCard(ap, ownerUser)).toBe(true)
    })

    it('returns false if no target column is valid for the given user', () => {
      const unrelatedUser = { id: 'user-unrelated', role: 'PIC' as const, divisionId: 'div-9' }
      const ap = { status: 'NOT_STARTED', picId: 'user-owner', divisionId: 'div-1', isPersonal: false, taskId: 't1' }
      expect(canDragKanbanCard(ap, unrelatedUser)).toBe(false)
    })
  })
})
