import { NextResponse } from 'next/server'
import { devListAccounts, DEV_IMPERSONATE_ENABLED } from '@/lib/dev-impersonate'
import { getSessionUser } from '@/lib/rbac'

export async function GET() {
  if (!DEV_IMPERSONATE_ENABLED) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const user = await getSessionUser()
  if (!user || user.role === 'GUEST' || user.isGuest || user.id.startsWith('guest-')) {
    return NextResponse.json(
      { error: 'Akses ditolak: Mode Guest/Demo tidak diizinkan mengakses daftar akun dev' },
      { status: 403 }
    )
  }

  const accounts = await devListAccounts()
  return NextResponse.json({ ok: true, accounts })
}