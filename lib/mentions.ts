import { prisma } from '@/lib/prisma'

/**
 * Extract kandidat user id dari teks komentar, format literal `@userId` (cuid).
 * Tidak validasi apakah user-nya nyata — itu tugas resolveMentions.
 */
export function extractMentionIds(content: string): string[] {
  const matches = content.match(/@([a-z0-9]{20,30})/g) ?? []
  const ids = matches.map((m) => m.slice(1))
  return [...new Set(ids)]
}

/**
 * Validasi kandidat mention terhadap tenant + status user.
 * Filter companyId di sini adalah garis pertahanan cross-tenant leak
 * sekaligus penyaring false-positive dari regex extractMentionIds.
 */
export async function resolveMentions(ids: string[], companyId: string) {
  if (ids.length === 0) return []
  return prisma.user.findMany({
    where: { id: { in: ids }, companyId, deletedAt: null, status: 'ACTIVE' },
    select: { id: true, name: true },
  })
}
