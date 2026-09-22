/**
 * Aturan jendela edit komentar — CLIENT-SAFE.
 * File ini TIDAK BOLEH mengimpor lib/prisma.ts atau modul server apapun:
 * CommentThread.tsx ('use client') memakainya untuk gating tombol Edit, dan
 * route PATCH memakainya untuk menegakkan jendela yang sama di server.
 * Satu sumber kebenaran — kalau tombol dan server pakai angka berbeda, user
 * menulis ulang komentar lalu ditolak.
 */

/** Keputusan Product Owner: 15 menit sejak createdAt. */
export const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000

export function editDeadline(createdAt: string | Date): Date {
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt)
  return new Date(base.getTime() + COMMENT_EDIT_WINDOW_MS)
}

/**
 * `now` WAJIB dioper — pola sama dengan timeAgo (lib/date-utils.ts:78).
 * Tanpa default `new Date()`: pemanggil client mengambil `now` dari state
 * ticking supaya render server dan client identik.
 *
 * Batas dievaluasi ketat (`<`): tepat pada menit ke-15 sudah DITOLAK.
 */
export function isWithinEditWindow(createdAt: string | Date, now: Date): boolean {
  return now.getTime() < editDeadline(createdAt).getTime()
}

/**
 * Delta mention: hanya id yang BARU muncul yang perlu divalidasi ulang.
 *
 * Mention lama sengaja lolos tanpa dicek ulang. Kalau ikut divalidasi, user
 * yang pindah divisi atau dinonaktifkan setelah komentar dibuat akan mengunci
 * komentar itu permanen — penulisnya tidak akan pernah bisa menyuntingnya lagi
 * padahal dia tidak menambah mention apapun.
 *
 * Fungsi murni supaya bisa diuji tanpa DB (scripts/test-comment-edit.ts).
 */
export function addedMentionIds(oldIds: string[], newIds: string[]): string[] {
  const old = new Set(oldIds)
  return newIds.filter((id) => !old.has(id))
}
