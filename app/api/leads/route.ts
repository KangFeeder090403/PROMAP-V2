import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canManageLeads } from '@/lib/rbac'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!canManageLeads(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const allowedSortFields = ['createdAt', 'name', 'companyName', 'status', 'lastLoginAt']
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'

    // Lead lintas-tenant by design — tidak difilter companyId.
    const data = await prisma.lead.findMany({ orderBy: { [safeSortBy]: sortOrder } })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[LEADS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
