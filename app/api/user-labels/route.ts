import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canManageUserLabel } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { createUserLabelSchema } from '@/lib/validations/userLabel'

export async function GET() {
  try {
    // Sengaja tidak block role PIC (beda dari /api/users): PIC butuh dropdown
    // UserLabel saat mengisi form lain (PRD baris 105), bukan lupa guard.
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where = user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId! }

    const data = await prisma.userLabel.findMany({
      where: { ...where, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[USER_LABELS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!canManageUserLabel(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createUserLabelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }, { status: 400 })
    }
    const { name } = parsed.data

    let targetCompanyId = user.companyId
    if (user.role === 'SUPER_ADMIN') {
      if (!body.companyId) {
        return NextResponse.json({ error: 'companyId wajib diisi untuk SUPER_ADMIN' }, { status: 400 })
      }
      const company = await prisma.company.findUnique({ where: { id: body.companyId } })
      if (!company || company.deletedAt) {
        return NextResponse.json({ error: 'companyId tidak valid' }, { status: 400 })
      }
      targetCompanyId = body.companyId
    }
    if (!targetCompanyId) {
      return NextResponse.json({ error: 'Company ID tidak ditemukan' }, { status: 400 })
    }

    // ponytail: cek-lalu-create masih bisa race; unique index parsial butuh ubah schema, tanya PO
    const dup = await prisma.userLabel.findFirst({
      where: {
        companyId: targetCompanyId,
        name: { equals: name, mode: 'insensitive' },
        status: { not: 'REJECTED' },
        deletedAt: null,
      },
      select: { id: true },
    })
    if (dup) {
      return NextResponse.json({ error: `Label "${name}" sudah ada` }, { status: 409 })
    }

    // Status TIDAK PERNAH dipercaya dari body — server yang memutuskan.
    const isDirectApprover = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL'

    const result = await prisma.userLabel.create({
      data: {
        name,
        companyId: targetCompanyId,
        status: isDirectApprover ? 'ACTIVE' : 'PENDING',
        approvedById: isDirectApprover ? user.id : null,
        requestedById: isDirectApprover ? null : user.id,
      },
    })

    if (!isDirectApprover) {
      const admins = await prisma.user.findMany({
        where: { companyId: targetCompanyId, role: 'ADMIN_OPERATIONAL', deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      })
      await notify({
        userIds: admins.map((a) => a.id),
        title: 'Label jabatan diusulkan Manager',
        message: `${user.name} mengusulkan label jabatan baru: "${result.name}".`,
        link: `/settings/user-labels`,
        companyId: targetCompanyId,
      })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('[USER_LABELS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
