import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'

const MAX_SUBS_PER_USER = 10
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /\.push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/,
  /\.push\.apple\.com$/,
]

function isValidEndpoint(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 2048) return false
  try {
    const u = new URL(v)
    return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname))
  } catch {
    return false
  }
}

function isValidKey(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= 256
}

async function authorize() {
  const user = await getSessionUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role === 'GUEST') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user }
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const { user, error } = await authorize()
    if (error) return error

    const body = await readJson(req)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const endpoint = body.endpoint
    const keys = (body.keys ?? {}) as Record<string, unknown>
    if (!isValidEndpoint(endpoint)) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }
    if (!isValidKey(keys.p256dh) || !isValidKey(keys.auth)) {
      return NextResponse.json({ error: 'Invalid subscription keys' }, { status: 400 })
    }
    const p256dh = keys.p256dh
    const auth = keys.auth

    // Batas 10 perangkat per user: buang yang terlama (kecuali endpoint ini sudah terdaftar)
    const existing = await prisma.pushSubscription.findMany({
      where: { userId: user.id, endpoint: { not: endpoint } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    const excess = existing.length - (MAX_SUBS_PER_USER - 1)
    if (excess > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: existing.slice(0, excess).map((s) => s.id) } },
      })
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh, auth },
      create: { userId: user.id, endpoint, p256dh, auth },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[API_ERROR] push/subscribe POST', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, error } = await authorize()
    if (error) return error

    const body = await readJson(req)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const endpoint = body.endpoint
    if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > 2048) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[API_ERROR] push/subscribe DELETE', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
