import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'

function templateScope(user: { role: string; companyId: string | null; divisionId: string | null }) {
  if (user.role === 'SUPER_ADMIN') return {}
  if (user.role === 'ADMIN_OPERATIONAL') {
    return { division: { companyId: user.companyId! } }
  }
  if (user.role === 'MANAGER') {
    return { divisionId: user.divisionId! }
  }
  return { divisionId: user.divisionId! }
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role === 'GUEST') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = await prisma.actionTemplate.findMany({
      where: templateScope(user),
      include: { division: { select: { id: true, name: true, companyId: true } } },
      orderBy: [{ division: { name: 'asc' } }, { title: 'asc' }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('[ACTION_TEMPLATES_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role === 'GUEST') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, divisionId } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Judul template wajib diisi' }, { status: 400 })
    }
    if (!divisionId) {
      return NextResponse.json({ error: 'Divisi wajib dipilih' }, { status: 400 })
    }

    // Guard: MANAGER hanya boleh buat template untuk divisinya sendiri
    if (user.role === 'MANAGER' && divisionId !== user.divisionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verifikasi divisi ada dan milik company yang benar
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    })
    if (!division || division.deletedAt) {
      return NextResponse.json({ error: 'Divisi tidak ditemukan' }, { status: 404 })
    }
    if (user.role === 'ADMIN_OPERATIONAL' && division.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const template = await prisma.actionTemplate.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        divisionId,
      },
      include: { division: { select: { id: true, name: true, companyId: true } } },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('[ACTION_TEMPLATES_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
