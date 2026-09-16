import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSessionUser, requireRole, canManageUsers } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { googleEnabled } from '@/lib/auth'

// Password TIDAK PERNAH dikembalikan di response manapun.
const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  status: true,
  companyId: true,
  divisionId: true,
  supervisorId: true,
  userLabelId: true,
  isGuest: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let where: Record<string, unknown> = {}
    if (user.role === 'ADMIN_OPERATIONAL') where = { companyId: user.companyId }
    else if (user.role === 'MANAGER') where = { companyId: user.companyId }
    else if (user.role === 'PIC') where = { companyId: user.companyId, status: 'ACTIVE' }
    // SUPER_ADMIN: tanpa filter

    const data = await prisma.user.findMany({
      where: { ...where, deletedAt: null },
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[USERS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roleError = requireRole(['SUPER_ADMIN', 'ADMIN_OPERATIONAL'])(user)
    if (roleError) return roleError
    if (!canManageUsers(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.email || !body.name) {
      return NextResponse.json({ error: 'email dan name wajib diisi' }, { status: 400 })
    }

    // Whitelist role saat pembuatan user:
    // ADMIN_OPERATIONAL hanya boleh buat ADMIN_OPERATIONAL, MANAGER, atau PIC.
    // SUPER_ADMIN hanya boleh dibuat oleh SUPER_ADMIN.
    // Dihitung di sini (bukan setelah validasi relasi) karena guard password
    // di bawah bergantung pada role target.
    const targetRole = body.role ?? 'PIC'
    const ADMIN_OPERATIONAL_ASSIGNABLE = ['ADMIN_OPERATIONAL', 'MANAGER', 'PIC']
    if (user.role === 'ADMIN_OPERATIONAL' && !ADMIN_OPERATIONAL_ASSIGNABLE.includes(targetRole)) {
      return NextResponse.json({ error: 'Role tidak diizinkan untuk Admin Operational' }, { status: 403 })
    }
    if (targetRole === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Hanya Super Admin yang bisa membuat Super Admin' }, { status: 403 })
    }

    // Password opsional: kalau kosong, akun jadi SSO-only (password: null) dan
    // hanya bisa masuk lewat Google — authorize() credentials menolak user tanpa password.
    const rawPassword = typeof body.password === 'string' ? body.password : ''
    const hasPassword = rawPassword.length > 0

    // Role administratif wajib punya password: jalur masuk cadangan yang tidak
    // bergantung pada ketersediaan / konfigurasi Google SSO.
    if (!hasPassword && (targetRole === 'ADMIN_OPERATIONAL' || targetRole === 'SUPER_ADMIN')) {
      return NextResponse.json(
        {
          error:
            'Password wajib diisi untuk role Admin Operational dan Super Admin. Role administratif harus tetap bisa masuk walau Google SSO bermasalah.',
        },
        { status: 400 }
      )
    }

    // Tanpa password dan tanpa SSO = akun yang tidak bisa dipakai sama sekali.
    if (!hasPassword && !googleEnabled) {
      return NextResponse.json(
        {
          error:
            'Password wajib diisi karena Google SSO belum aktif di instance ini. Akun tanpa password tidak akan bisa masuk.',
        },
        { status: 400 }
      )
    }

    // Lantai 8 karakter ditegakkan di server (NIST SP 800-63B).
    // createUserSchema hanya berlaku di klien — route ini tidak memanggilnya.
    if (hasPassword && rawPassword.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
    }

    // companyId wajib dari session — Admin Ops = company sendiri.
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

    // Seat Quota Guard berdasarkan subscription tier perusahaan (PRD §B10 & Settings)
    const QUOTA_MAP: Record<string, number> = { BASIC: 20, PREMIUM: 35, ENTERPRISE: 50 }
    const targetCompany = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      select: { id: true, name: true, subscription: true, deletedAt: true },
    })
    if (!targetCompany || targetCompany.deletedAt) {
      return NextResponse.json({ error: 'Company tidak valid atau telah dihapus' }, { status: 400 })
    }

    const quota = QUOTA_MAP[targetCompany.subscription] ?? 50
    const activeCount = await prisma.user.count({
      where: {
        companyId: targetCompanyId,
        deletedAt: null,
        isGuest: false,
      },
    })
    if (activeCount >= quota) {
      return NextResponse.json(
        {
          error: `Batas kuota pengguna untuk perusahaan "${targetCompany.name}" telah tercapai (${quota} kursi pada paket ${targetCompany.subscription}). Upgrade paket untuk menambah kuota.`,
        },
        { status: 403 }
      )
    }

    // Validasi relasi opsional: harus ada, belum di-soft-delete, dan companyId sama.
    if (body.divisionId) {
      const division = await prisma.division.findUnique({ where: { id: body.divisionId } })
      if (!division || division.deletedAt || division.companyId !== targetCompanyId) {
        return NextResponse.json({ error: 'divisionId tidak valid' }, { status: 400 })
      }
    }
    if (body.userLabelId) {
      const label = await prisma.userLabel.findUnique({ where: { id: body.userLabelId } })
      if (!label || label.deletedAt || label.companyId !== targetCompanyId) {
        return NextResponse.json({ error: 'userLabelId tidak valid' }, { status: 400 })
      }
    }
    if (body.supervisorId) {
      const supervisor = await prisma.user.findUnique({ where: { id: body.supervisorId } })
      if (!supervisor || supervisor.deletedAt || supervisor.companyId !== targetCompanyId) {
        return NextResponse.json({ error: 'supervisorId tidak valid' }, { status: 400 })
      }
    }

    const hashed = hasPassword ? await bcrypt.hash(rawPassword, 12) : null

    const result = await prisma.user.create({
      data: {
        email: body.email.toLowerCase().trim(),
        name: body.name,
        phone: body.phone ?? null,
        password: hashed,
        role: targetRole,
        // status selalu PENDING saat dibuat — approval terpisah lewat /approve
        status: 'PENDING',
        companyId: targetCompanyId,
        divisionId: body.divisionId ?? null,
        userLabelId: body.userLabelId ?? null,
        supervisorId: body.supervisorId ?? null,
      },
      select: SAFE_SELECT,
    })

    const admins = await prisma.user.findMany({
      where: { companyId: targetCompanyId, role: 'ADMIN_OPERATIONAL', deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    })
    await notify({
      userIds: admins.map((a) => a.id),
      title: 'User baru menunggu persetujuan',
      message: hasPassword
        ? `${result.name} (${result.email}) dibuat dengan email dan kata sandi, menunggu approval.`
        : `${result.name} (${result.email}) dibuat tanpa kata sandi dan hanya bisa masuk lewat Google, menunggu approval.`,
      link: '/settings?tab=user',
      companyId: targetCompanyId,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('[USERS_POST]', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
