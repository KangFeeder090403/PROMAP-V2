import { NextResponse, type NextRequest } from 'next/server'
import { devImpersonate, devStopImpersonate, DEV_IMPERSONATE_ENABLED } from '@/lib/dev-impersonate'

// Dev-only: mati total di production (helper kembalikan null / 404).
export async function POST(req: NextRequest) {
  if (!DEV_IMPERSONATE_ENABLED) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
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
  const res = await devStopImpersonate(req)
  if (!res) {
    return NextResponse.json({ error: 'Tidak ada sesi aktif' }, { status: 401 })
  }
  return res
}