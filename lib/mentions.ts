import type { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export { extractMentionIds } from '@/lib/mention-parse'

/**
 * K5 — resolveMentions() LAMA DIHAPUS.
 *
 * Versi lama hanya menyaring { companyId, deletedAt: null, status: 'ACTIVE' }.
 * Itu lebih longgar dari himpunan mentionable: ia meloloskan user GUEST dan
 * user di luar jangkauan apScope() AP terkait — persis penyebab mention lintas
 * divisi bocor (PIC divisi lain dapat notifikasi berisi judul AP lalu menekan
 * link yang 404 karena apScope() menolaknya).
 *
 * Dua sumber kebenaran = bug menunggu. Sekarang hanya ada SATU:
 * mentionableUserWhere(). Endpoint daftar mention dan validasi POST komentar
 * memakai predikat yang sama persis.
 */

export type MentionableApContext = {
  companyId: string
  divisionId: string | null
  picId: string
}

/**
 * K1 — INVERS dari apScope(): siapa saja yang apScope()-nya mencakup AP ini,
 * jadi merekalah yang boleh di-mention (mereka bisa membuka link notifikasinya).
 *
 * Cabang per role dibaca langsung dari apScope() (lib/rbac.ts:177-187):
 *   SUPER_ADMIN        -> {} (semua AP)          => selalu masuk
 *   ADMIN_OPERATIONAL  -> { companyId }          => masuk kalau company sama
 *   MANAGER            -> { divisionId }         => masuk kalau divisi sama
 *   PIC                -> { picId: user.id }     => masuk kalau dia PIC-nya
 *
 * ap.picId masuk TANPA SYARAT ROLE APAPUN. Alasannya rbac.ts:183 — MANAGER
 * tanpa divisionId jatuh ke { picId: user.id }, bukan ke cabang divisi. Jadi
 * himpunan per-role saja tidak cukup; bentuknya wajib (cabang role) OR picId.
 *
 * role: { not: 'GUEST' } berdampingan dengan isGuest: false karena
 * getSessionUser() menolak keduanya sebagai DUA cek terpisah (rbac.ts:22-23).
 * Kalau hanya isGuest yang disaring, user role GUEST dengan isGuest=false lolos
 * ke daftar mention padahal tidak akan pernah bisa login membuka link-nya.
 */
export function mentionableUserWhere(ap: MentionableApContext): Prisma.UserWhereInput {
  const roleBranches: Prisma.UserWhereInput[] = [
    // SUPER_ADMIN lintas-tenant (companyId null, lihat prisma/seed.ts:176-183)
    // SENGAJA TIDAK masuk — tertahan klausa companyId di bawah. Alasannya
    // K1 memuat dua aturan yang bertabrakan di titik ini: "invers apScope"
    // (SUPER_ADMIN -> {} jadi semestinya selalu masuk) versus "companyId
    // sesuai AP". Yang dimenangkan adalah companyId: menampilkan nama staf
    // vendor di dropdown mention milik perusahaan pelanggan membocorkan
    // identitas lintas-tenant, dan SUPER_ADMIN toh bisa membaca AP-nya tanpa
    // perlu di-mention. SUPER_ADMIN yang punya companyId sama tetap masuk.
    { role: 'SUPER_ADMIN' },
    { role: 'ADMIN_OPERATIONAL' },
  ]

  // AP dengan divisi: Manager dan seluruh PIC di divisi tersebut dapat di-mention.
  // AP personal (divisionId null): seluruh anggota aktif dalam perusahaan dapat di-mention.
  if (ap.divisionId) {
    roleBranches.push({ role: 'MANAGER', divisionId: ap.divisionId })
    roleBranches.push({ role: 'PIC', divisionId: ap.divisionId })
  } else {
    roleBranches.push({ companyId: ap.companyId })
  }

  return {
    deletedAt: null,
    status: 'ACTIVE',
    isGuest: false,
    role: { not: 'GUEST' },
    companyId: ap.companyId,
    OR: [...roleBranches, { id: ap.picId }],
  }
}

/**
 * Daftar user yang boleh di-mention pada satu AP. Dipakai endpoint
 * GET /api/action-plans/[id]/mentionable-users dan validasi POST komentar.
 */
export function findMentionableUsers(ap: MentionableApContext) {
  return prisma.user.findMany({
    where: mentionableUserWhere(ap),
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })
}

/**
 * Validasi kandidat id mention terhadap himpunan mentionable AP ini.
 * Mengembalikan yang lolos (valid) dan yang ditolak (rejected) supaya route
 * bisa menyebut siapa yang ditolak, bukan error 400 generik (K8).
 */
export async function resolveMentionsForAp(ids: string[], ap: MentionableApContext) {
  if (ids.length === 0) return { valid: [] as { id: string; name: string }[], rejectedIds: [] as string[] }

  const valid = await prisma.user.findMany({
    where: { ...mentionableUserWhere(ap), id: { in: ids } },
    select: { id: true, name: true },
  })

  const validIds = new Set(valid.map((u) => u.id))
  return { valid, rejectedIds: ids.filter((id) => !validIds.has(id)) }
}

/**
 * K8 — pesan penolakan mention yang menyebut SIAPA yang ditolak. Dipakai POST
 * dan PATCH komentar.
 *
 * Tinggal di sini, bukan di route.ts: App Router hanya mengizinkan export HTTP
 * handler + config dari route.ts, jadi helper non-handler di sana akan gagal.
 * Menyalin blok ini ke dua route = dua teks pesan yang pelan-pelan berbeda.
 */
export async function buildMentionRejectionMessage(
  rejectedIds: string[],
  companyId: string
): Promise<string> {
  const known = await prisma.user.findMany({
    where: { id: { in: rejectedIds }, companyId, deletedAt: null },
    select: { id: true, name: true },
  })
  const namedList = known.map((u) => u.name)
  const unknownCount = rejectedIds.length - known.length

  const parts: string[] = []
  if (namedList.length > 0) {
    parts.push(
      `${namedList.join(', ')} tidak bisa di-mention di Action Plan ini karena berada di luar divisi atau jangkauan aksesnya`
    )
  }
  if (unknownCount > 0) {
    parts.push(`${unknownCount} mention tidak dikenali atau sudah tidak aktif`)
  }

  return `${parts.join('. ')}. Hapus mention tersebut lalu kirim ulang — isi komentar Anda tidak terhapus.`
}
