import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/rbac'
import { getQuarterlyAggregation } from '@/lib/calendar-query'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const yearRaw = searchParams.get('year')
    const year = Number(yearRaw) || new Date().getFullYear()

    const result = await getQuarterlyAggregation(user, year)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[CALENDAR_QUARTERS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
