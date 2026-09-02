import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canManageLeads } from '@/lib/rbac'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!canManageLeads(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Lead lintas-tenant by design — tidak difilter companyId.
    const data = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[LEADS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
