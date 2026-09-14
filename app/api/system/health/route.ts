import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const start = performance.now()
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Math.round(performance.now() - start)

    return NextResponse.json({
      status: 'OK',
      database: 'connected',
      latencyMs: Math.max(1, latencyMs),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[SYSTEM_HEALTH_GET]', error)
    return NextResponse.json({ error: 'Database ping failed' }, { status: 500 })
  }
}
