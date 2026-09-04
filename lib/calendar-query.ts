import type { User, Prisma } from '@/lib/generated/prisma/client'
import { apScope } from '@/lib/rbac'

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
  to: Date
): Prisma.ActionPlanWhereInput {
  return {
    ...apScope(user),
    deletedAt: null,
    AND: [{ startDate: { lte: to } }, { endDate: { gte: from } }],
  }
}
