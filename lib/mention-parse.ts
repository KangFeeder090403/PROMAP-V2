/**
 * Parsing mention yang AMAN untuk client ('use client') — file ini TIDAK BOLEH
 * mengimpor lib/prisma.ts (driver pg, node-only) atau modul server apapun.
 * lib/mentions.ts (server) mengimpor dari sini supaya aturan parsing hanya
 * punya satu sumber kebenaran.
 */

/** Format literal mention yang disimpan di kolom Comment.content: `@<cuid>`. */
export const MENTION_ID_PATTERN = /@([a-z0-9]{20,30})/g

/**
 * Trigger popover autocomplete. Dibaca dari teks sampai posisi caret.
 *
 * Aturan:
 * - `@` wajib di awal teks atau didahului whitespace / kurung buka —
 *   `a@b` (mis. alamat email) TIDAK memicu.
 * - Query boleh memuat MAKSIMAL SATU spasi internal (nama depan + nama belakang).
 *   Spasi kedua menutup popover, sehingga popover tidak menggantung
 *   sepanjang sisa kalimat.
 */
export const MENTION_TRIGGER_PATTERN = /(?:^|[\s(])@([A-Za-z0-9._-]*(?: [A-Za-z0-9._-]*)?)$/

/**
 * Ambil kandidat user id dari teks komentar. Tidak memvalidasi apakah user-nya
 * nyata dan boleh di-mention — itu tugas resolveMentionsForAp di sisi server.
 */
export function extractMentionIds(content: string): string[] {
  const matches = content.match(MENTION_ID_PATTERN) ?? []
  return [...new Set(matches.map((m) => m.slice(1)))]
}

export type MentionTrigger = {
  /** Teks pencarian setelah `@`, sudah lowercase. */
  query: string
  /** Index karakter `@` di dalam teks penuh — titik sisip saat memilih. */
  start: number
}

/**
 * Cek apakah caret sedang berada di dalam token mention yang sedang diketik.
 * `textUpToCaret` = value.slice(0, caret).
 */
export function findMentionTrigger(textUpToCaret: string): MentionTrigger | null {
  const match = MENTION_TRIGGER_PATTERN.exec(textUpToCaret)
  if (!match) return null

  // Grup (?:^|[\s(]) ikut termakan match[0]; kalau bukan awal string,
  // satu karakter pemisah harus dilewati untuk mendapat index '@'.
  const leadOffset = match[0].startsWith('@') ? 0 : 1
  return {
    query: match[1].toLowerCase(),
    start: match.index + leadOffset,
  }
}

export type MentionToken = { type: 'text'; value: string } | { type: 'mention'; id: string }

/**
 * Pecah konten jadi token teks & mention memakai MENTION_ID_PATTERN yang sama
 * persis dengan extractMentionIds.
 *
 * Sengaja TIDAK memakai alternasi `@(id1|id2)`: regex alternasi mencocok cabang
 * pertama yang match, jadi id yang kebetulan jadi prefiks id lain menyisakan
 * karakter menggantung di layar. Satu pola tetap = hasil tampilan selalu sama
 * dengan yang di-parse server.
 */
export function tokenizeMentions(content: string): MentionToken[] {
  const tokens: MentionToken[] = []
  const pattern = new RegExp(MENTION_ID_PATTERN.source, 'g')
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: content.slice(lastIndex, match.index) })
    }
    tokens.push({ type: 'mention', id: match[1] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    tokens.push({ type: 'text', value: content.slice(lastIndex) })
  }
  return tokens
}

/** Batas panjang komentar (keputusan Product Owner). */
export const COMMENT_MAX_LENGTH = 5000
