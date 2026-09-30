import { z } from 'zod'

/**
 * Normalisasi email untuk mencegah Homoglyph Authentication Bypass (GHSA-7rqj-j65f-68wh).
 * Menggunakan Unicode NFKC untuk menetralkan karakter serupa/homoglyph sebelum validasi email.
 */
export function normalizeEmail(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .trim()
}

export const loginSchema = z.object({
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(z.string().email('Email tidak valid')),
  password: z.string().min(1, 'Password wajib diisi'),
})

