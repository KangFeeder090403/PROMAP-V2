import { after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUsers } from '@/lib/web-push'

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

  // Web Push — jalankan setelah response terkirim (after) agar tidak terputus
  // di serverless; di luar request scope (cron/script) after() melempar,
  // fallback fire-and-forget.
  const push = () =>
    sendPushToUsers(params.userIds, {
      title: params.title,
      body: params.message,
      url: params.link,
    }).catch(() => {})
  try {
    after(push)
  } catch {
    void push()
  }
}
