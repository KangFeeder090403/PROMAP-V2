import { prisma } from '@/lib/prisma'

export type ActivityAction =
  | 'STATUS_CHANGED'
  | 'EVIDENCE_SUBMITTED'
  | 'COMMENT_ADDED'
  | 'COMMENT_EDITED'
  | 'REASSIGNED'
  | 'REMINDER_SENT'
  | 'CREATED'
  | 'UPDATED'
  | 'USER_UPDATE'

export async function logActivity({
  userId,
  actionPlanId,
  projectId,
  action,
  oldValue,
  newValue,
}: {
  userId: string
  actionPlanId?: string | null
  projectId?: string | null
  action: ActivityAction
  oldValue?: string | null
  newValue?: string | null
}) {
  try {
    return await prisma.activityLog.create({
      data: {
        userId,
        actionPlanId: actionPlanId ?? null,
        projectId: projectId ?? null,
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
