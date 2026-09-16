/**
 * Helper zona waktu untuk operasional bisnis Indonesia (WIB / UTC+7).
 * Menjamin lingkungan serverless (seperti Vercel yang default timezone-nya UTC)
 * menghasilkan perhitungan "hari ini", rentang tanggal, dan sapaan waktu
 * yang konsisten dengan waktu lokal pengguna di Indonesia.
 */

export const WIB_OFFSET_HOURS = 7
export const WIB_OFFSET_MS = WIB_OFFSET_HOURS * 60 * 60 * 1000

/**
 * Mengembalikan objek Date yang digeser ke UTC+7 sehingga pemanggilan
 * getUTCFullYear(), getUTCMonth(), getUTCDate(), getUTCHours() cocok dengan waktu WIB.
 */
export function getJakartaNow(): Date {
  const now = new Date()
  return new Date(now.getTime() + WIB_OFFSET_MS)
}

/**
 * Mengembalikan jam saat ini dalam format 0-23 waktu WIB.
 */
export function getJakartaHour(): number {
  return getJakartaNow().getUTCHours()
}

/**
 * Sapaan waktu dinamis ramah pengguna berbasis jam WIB (Asia/Jakarta).
 */
export function getJakartaTimeGreeting(): string {
  const h = getJakartaHour()
  if (h >= 5 && h < 11) return 'Selamat Pagi'
  if (h >= 11 && h < 15) return 'Selamat Siang'
  if (h >= 15 && h < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}

/**
 * Rentang waktu awal (00:00:00 WIB) dan akhir (23:59:59.999 WIB) untuk hari ini,
 * dinormalisasi ke objek Date UTC untuk query Prisma.
 */
export function getJakartaTodayRange(): { start: Date; end: Date } {
  const jNow = getJakartaNow()
  const y = jNow.getUTCFullYear()
  const m = jNow.getUTCMonth()
  const d = jNow.getUTCDate()

  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - WIB_OFFSET_MS)
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - WIB_OFFSET_MS)
  return { start, end }
}

/**
 * Rentang waktu awal pekan (Senin 00:00:00 WIB) dan akhir pekan (Minggu 23:59:59.999 WIB)
 */
export function getJakartaWeekRange(): { start: Date; end: Date } {
  const jNow = getJakartaNow()
  const y = jNow.getUTCFullYear()
  const m = jNow.getUTCMonth()
  const d = jNow.getUTCDate()
  const dayOfWeek = jNow.getUTCDay() // 0 = Minggu, 1 = Senin, ...
  const diffToMonday = (dayOfWeek + 6) % 7

  const start = new Date(Date.UTC(y, m, d - diffToMonday, 0, 0, 0, 0) - WIB_OFFSET_MS)
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
  return { start, end }
}

/**
 * Rentang waktu awal bulan (Tanggal 1 00:00:00 WIB) dan akhir bulan (23:59:59.999 WIB)
 */
export function getJakartaMonthRange(): { start: Date; end: Date } {
  const jNow = getJakartaNow()
  const y = jNow.getUTCFullYear()
  const m = jNow.getUTCMonth()

  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - WIB_OFFSET_MS)
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - WIB_OFFSET_MS)
  return { start, end }
}
