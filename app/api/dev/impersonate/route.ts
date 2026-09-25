import { NextResponse, type NextRequest } from 'next/server'
import { devImpersonate, devStopImpersonate, DEV_IMPERSONATE_ENABLED } from '@/lib/dev-impersonate'
import { getSessionUser } from '@/lib/rbac'

// Dev-only: mati total di production (helper kembalikan null / 404).
export async function POST(req: NextRequest) {
  if (!DEV_IMPERSONATE_ENABLED) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const user = await getSessionUser()
  if (!user || user.role === 'GUEST' || user.isGuest || user.id.startsWith('guest-')) {
    return NextResponse.json(
      { error: 'Akses ditolak: Mode Guest/Demo tidak diizinkan berganti akun (switch account)' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const res = await devImpersonate(req, body.userId as string)
  if (!res) {
    return NextResponse.json(
      { error: 'Akun target tidak ditemukan atau tidak aktif' },
      { status: 404 }
    )
  }
  return res
}

export async function DELETE(req: NextRequest) {
  if (!DEV_IMPERSONATE_ENABLED) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const user = await getSessionUser()
  if (!user || user.role === 'GUEST' || user.isGuest || user.id.startsWith('guest-')) {
    return NextResponse.json(
      { error: 'Akses ditolak: Mode Guest/Demo tidak diizinkan mengakses fitur dev impersonation' },
      { status: 403 }
    )
  }

  const res = await devStopImpersonate(req)
  if (!res) {
    return NextResponse.json({ error: 'Tidak ada sesi aktif' }, { status: 401 })
  }
  return res
}