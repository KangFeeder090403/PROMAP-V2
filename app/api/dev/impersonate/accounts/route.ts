import { NextResponse } from 'next/server'
import { devListAccounts, DEV_IMPERSONATE_ENABLED } from '@/lib/dev-impersonate'

export async function GET() {
  if (!DEV_IMPERSONATE_ENABLED) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }
  const accounts = await devListAccounts()
  return NextResponse.json({ ok: true, accounts })
}