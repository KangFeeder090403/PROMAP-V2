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

export interface ActivityLogEntry {
  userId: string
  actionPlanId?: string | null
  projectId?: string | null
  action: ActivityAction
  oldValue?: string | null
  newValue?: string | null
}

export async function logActivity({
  userId,
  actionPlanId,
  projectId,
  action,
  oldValue,
  newValue,
}: ActivityLogEntry) {
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

/**
 * Versi batch dari logActivity: satu INSERT untuk N entri.
 * Sifat non-blocking dipertahankan — kegagalan audit mengembalikan 0,
 * tidak pernah melempar ke pemanggil.
 */
export async function logActivityMany(entries: ActivityLogEntry[]) {
  if (entries.length === 0) return 0
  try {
    const result = await prisma.activityLog.createMany({
      data: entries.map((e) => ({
        userId: e.userId,
        actionPlanId: e.actionPlanId ?? null,
        projectId: e.projectId ?? null,
        action: e.action,
        oldValue: e.oldValue ?? null,
        newValue: e.newValue ?? null,
      })),
    })
    return result.count
  } catch (error) {
    console.error('[ACTIVITY_LOG_ERROR]', error)
    return 0
  }
}
