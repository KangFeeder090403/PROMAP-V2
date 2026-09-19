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

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const allowedSortFields = ['createdAt', 'name', 'email', 'role', 'status']
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'

    let where: Record<string, unknown> = {}
    if (user.role === 'ADMIN_OPERATIONAL') where = { companyId: user.companyId }
    else if (user.role === 'MANAGER') where = { companyId: user.companyId }
    else if (user.role === 'PIC') where = { companyId: user.companyId, status: 'ACTIVE' }
    // SUPER_ADMIN: tanpa filter

    const data = await prisma.user.findMany({
      where: { ...where, deletedAt: null },
      select: SAFE_SELECT,
      orderBy: { [safeSortBy]: sortOrder },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[USERS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

const ADMIN_OPERATIONAL_ASSIGNABLE = ['ADMIN_OPERATIONAL', 'MANAGER', 'PIC']
const QUOTA_MAP: Record<string, number> = { BASIC: 20, PREMIUM: 35, ENTERPRISE: 50 }

function validateRoleAssignment(userRole: string, targetRole: string): NextResponse | null {
  if (userRole === 'ADMIN_OPERATIONAL' && !ADMIN_OPERATIONAL_ASSIGNABLE.includes(targetRole)) {
    return NextResponse.json({ error: 'Role tidak diizinkan untuk Admin Operational' }, { status: 403 })
  }
  if (targetRole === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Hanya Super Admin yang bisa membuat Super Admin' }, { status: 403 })
  }
  return null
}

function validateUserPassword(targetRole: string, rawPassword: string): NextResponse | null {
  const hasPassword = rawPassword.length > 0
  const isAdministrativeRole = targetRole === 'ADMIN_OPERATIONAL' || targetRole === 'SUPER_ADMIN'

  // Role administratif wajib punya password: jalur masuk cadangan yang tidak
  // bergantung pada ketersediaan / konfigurasi Google SSO.
  if (!hasPassword && isAdministrativeRole) {
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
  if (hasPassword && rawPassword.length < 8) {
    return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
  }

  return null
}

async function resolveAndValidateCompany(
  userRole: string,
  userCompanyId: string | null,
  bodyCompanyId?: string
): Promise<{ companyId?: string; error?: NextResponse }> {
  if (userRole !== 'SUPER_ADMIN') {
    if (!userCompanyId) {
      return { error: NextResponse.json({ error: 'Company ID tidak ditemukan' }, { status: 400 }) }
    }
    return { companyId: userCompanyId }
  }

  if (!bodyCompanyId) {
    return { error: NextResponse.json({ error: 'companyId wajib diisi untuk SUPER_ADMIN' }, { status: 400 }) }
  }

  const company = await prisma.company.findUnique({ where: { id: bodyCompanyId } })
  if (!company || company.deletedAt) {
    return { error: NextResponse.json({ error: 'companyId tidak valid' }, { status: 400 }) }
  }

  return { companyId: bodyCompanyId }
}

async function validateSeatQuota(companyId: string): Promise<NextResponse | null> {
  const targetCompany = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, subscription: true, deletedAt: true },
  })
  if (!targetCompany || targetCompany.deletedAt) {
    return NextResponse.json({ error: 'Company tidak valid atau telah dihapus' }, { status: 400 })
  }

  const quota = QUOTA_MAP[targetCompany.subscription] ?? 50
  const activeCount = await prisma.user.count({
    where: {
      companyId,
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

  return null
}

async function validateOptionalRelations(
  companyId: string,
  relations: { divisionId?: string; userLabelId?: string; supervisorId?: string }
): Promise<NextResponse | null> {
  if (relations.divisionId) {
    const division = await prisma.division.findUnique({ where: { id: relations.divisionId } })
    if (!division || division.deletedAt || division.companyId !== companyId) {
      return NextResponse.json({ error: 'divisionId tidak valid' }, { status: 400 })
    }
  }

  if (relations.userLabelId) {
    const label = await prisma.userLabel.findUnique({ where: { id: relations.userLabelId } })
    if (!label || label.deletedAt || label.companyId !== companyId) {
      return NextResponse.json({ error: 'userLabelId tidak valid' }, { status: 400 })
    }
  }

  if (relations.supervisorId) {
    const supervisor = await prisma.user.findUnique({ where: { id: relations.supervisorId } })
    if (!supervisor || supervisor.deletedAt || supervisor.companyId !== companyId) {
      return NextResponse.json({ error: 'supervisorId tidak valid' }, { status: 400 })
    }
  }

  return null
}

async function notifyAdminsNewUser(
  newUser: { name: string; email: string },
  companyId: string,
  hasPassword: boolean
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { companyId, role: 'ADMIN_OPERATIONAL', deletedAt: null, status: 'ACTIVE' },
    select: { id: true },
  })

  await notify({
    userIds: admins.map((a) => a.id),
    title: 'User baru menunggu persetujuan',
    message: hasPassword
      ? `${newUser.name} (${newUser.email}) dibuat dengan email dan kata sandi, menunggu approval.`
      : `${newUser.name} (${newUser.email}) dibuat tanpa kata sandi dan hanya bisa masuk lewat Google, menunggu approval.`,
    link: '/settings?tab=user',
    companyId,
  })
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

    const targetRole = body.role ?? 'PIC'
    const roleValidationError = validateRoleAssignment(user.role, targetRole)
    if (roleValidationError) return roleValidationError

    const rawPassword = typeof body.password === 'string' ? body.password : ''
    const passwordValidationError = validateUserPassword(targetRole, rawPassword)
    if (passwordValidationError) return passwordValidationError

    const { companyId: targetCompanyId, error: companyError } = await resolveAndValidateCompany(
      user.role,
      user.companyId,
      body.companyId
    )
    if (companyError || !targetCompanyId) {
      return companyError ?? NextResponse.json({ error: 'Company ID tidak ditemukan' }, { status: 400 })
    }

    const quotaError = await validateSeatQuota(targetCompanyId)
    if (quotaError) return quotaError

    const relationError = await validateOptionalRelations(targetCompanyId, {
      divisionId: body.divisionId,
      userLabelId: body.userLabelId,
      supervisorId: body.supervisorId,
    })
    if (relationError) return relationError

    const hasPassword = rawPassword.length > 0
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

    await notifyAdminsNewUser(result, targetCompanyId, hasPassword)

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    console.error('[USERS_POST]', error)
    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

