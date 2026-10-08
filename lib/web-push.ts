import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

let _initialized = false

function init() {
  if (_initialized) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@promap.id'
  if (!pub || !priv) return
  webpush.setVapidDetails(subject, pub, priv)
  _initialized = true
}

/**
 * Kirim Web Push ke semua perangkat terdaftar milik user-user yang diberikan.
 * Subscription kadaluarsa (HTTP 404/410) dihapus otomatis dari DB.
 * Fire-and-forget — tidak melempar error agar tidak mengganggu alur utama.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
) {
  if (userIds.length === 0) return
  init()
  if (!_initialized) return // VAPID keys belum dikonfigurasi

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds }, user: { deletedAt: null, status: 'ACTIVE' } },
  })
  if (subs.length === 0) return

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  })

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, data)
        .catch(async (err: unknown) => {
          const code = (err as { statusCode?: number })?.statusCode
          if (code === 404 || code === 410) {
            // Subscription kadaluarsa / tidak ditemukan — hapus dari DB
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          }
        }),
    ),
  )
}
