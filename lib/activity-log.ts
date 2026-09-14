import { prisma } from '@/lib/prisma'

export type ActivityAction =
  | 'STATUS_CHANGED'
  | 'EVIDENCE_SUBMITTED'
  | 'APPROVAL'
  | 'REASSIGNED'
  | 'TASK_CREATED'
  | 'AUTO_ESCALATION'
  | 'COMMENT_ADDED'
  | 'REMINDER_SENT'
  | 'CREATED'
  | 'UPDATED'

export interface AuditDiffPayload {
  revision?: string
  status?: string
  pic_assignee?: string
  risk_scoring?: string
  evidence_title?: string
  evidence_url?: string
  sha256_hash?: string
  task_title?: string
  project_title?: string
  reason?: string
  note?: string
  tx_uuid?: string
  [key: string]: unknown
}

export async function logActivity({
  userId,
  actionPlanId,
  action,
  oldValue,
  newValue,
}: {
  userId: string
  actionPlanId?: string | null
  action: ActivityAction
  oldValue?: string | null
  newValue?: string | null
}) {
  try {
    return await prisma.activityLog.create({
      data: {
        userId,
        actionPlanId: actionPlanId ?? null,
        action,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      },
    })
  } catch (error) {
    // Non-blocking: kegagalan logging tidak boleh menggagalkan transaksi bisnis
    console.error('[ACTIVITY_LOG_ERROR]', error)
    return null
  }
}

