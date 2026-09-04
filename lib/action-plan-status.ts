import type { ActionPlanStatus } from '@/lib/generated/prisma/client'

// APPROVED sengaja dead node — bukan status istirahat (PRD BAB 3.6: Kanban cuma 5 kolom,
// tidak ada kolom Approved). Manager approve -> status langsung COMPLETE.
// Enum Prisma tetap punya APPROVED (tidak di-drop, hindari breaking migration), hanya
// unreachable di logic map ini.
export const STATUS_TRANSITIONS: Record<ActionPlanStatus, ActionPlanStatus[]> = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['PENDING_APPROVAL', 'OVERDUE'],
  PENDING_APPROVAL: ['COMPLETE', 'REJECTED', 'EVIDENCE_REQUIRED'],
  EVIDENCE_REQUIRED: ['PENDING_APPROVAL'],
  REJECTED: ['IN_PROGRESS'],
  OVERDUE: ['IN_PROGRESS', 'PENDING_APPROVAL'],
  APPROVED: [],
  COMPLETE: [],
}

export function canTransition(from: ActionPlanStatus, to: ActionPlanStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}
