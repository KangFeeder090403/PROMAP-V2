import { prisma } from '@/lib/prisma'

/**
 * Notifikasi minimal — tulis ke DB saja (In-app).
 * Dipanggil oleh API route setelah operasi berhasil.
 * Modul notifikasi lengkap (bell, badge, navigasi) = roadmap #12.
 */
export async function notify(params: {
  userIds: string[]
  title: string
  message: string
  link?: string
  companyId?: string
}) {
  if (params.userIds.length === 0) return

  await prisma.notification.createMany({
    data: params.userIds.map((userId) => ({
      userId,
      companyId: params.companyId ?? null,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
    })),
  })
}
