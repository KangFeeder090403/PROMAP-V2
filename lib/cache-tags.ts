import { revalidateTag } from 'next/cache'

/**
 * Buang cache daftar project + opsi filter kalender untuk satu perusahaan.
 *
 * Tag ditulis pakai companyId PEMBACA (`lib/queries/projects-query.ts:168`,
 * `lib/queries/calendar-query-cached.ts:105`), sedangkan mutasi hanya tahu
 * companyId PROJECT. SUPER_ADMIN punya companyId null sehingga membaca lewat
 * tag `*-all` — karena itu 'all' selalu ikut dibuang.
 */
export function revalidateProjectCaches(companyId: string | null) {
  for (const scope of new Set([companyId ?? 'all', 'all'])) {
    try {
      revalidateTag(`projects-${scope}`)
      revalidateTag(`calendar-filters-${scope}`)
    } catch {
      // di luar request context (mis. cron/script) — abaikan
    }
  }
}
