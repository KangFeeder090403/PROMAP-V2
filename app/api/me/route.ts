import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { logActivity } from '@/lib/activity-log'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.isGuest) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        password: true,
        company: { select: { name: true } },
        division: { select: { name: true } },
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      role: dbUser.role,
      hasPassword: Boolean(dbUser.password),
      companyName: dbUser.company?.name || null,
      divisionName: dbUser.division?.name || null,
    })
  } catch (error) {
    console.error('[ME_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.isGuest) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 400 })
    }

    const { name, phone, currentPassword, newPassword } = body

    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nama minimal 2 karakter' }, { status: 400 })
    }
    const trimmedName = name.trim()
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : null

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    const isGoogleSSO = !dbUser.password
    const hasPasswordInput = Boolean(currentPassword || newPassword)

    if (isGoogleSSO && hasPasswordInput) {
      return NextResponse.json(
        { error: 'Akun Google SSO tidak dapat mengubah kata sandi' },
        { status: 400 }
      )
    }

    let hashedPassword: string | undefined = undefined

    if (newPassword !== undefined && newPassword !== '') {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'Kata sandi baru minimal 8 karakter' },
          { status: 400 }
        )
      }

      if (!currentPassword || typeof currentPassword !== 'string') {
        return NextResponse.json(
          { error: 'Kata sandi saat ini wajib diisi' },
          { status: 400 }
        )
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.password!)
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: 'Kata sandi saat ini tidak valid' },
          { status: 400 }
        )
      }

      hashedPassword = await bcrypt.hash(newPassword, 12)
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: trimmedName,
        phone: trimmedPhone || null,
        ...(hashedPassword ? { password: hashedPassword } : {}),
      },
    })

    await logActivity({
      userId: user.id,
      action: 'USER_UPDATE',
      oldValue: JSON.stringify({ name: dbUser.name, phone: dbUser.phone }),
      newValue: JSON.stringify({
        name: trimmedName,
        phone: trimmedPhone || null,
        passwordChanged: Boolean(hashedPassword),
      }),
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: updatedUser.name,
        email: dbUser.email,
        phone: updatedUser.phone,
      },
    })
  } catch (error) {
    console.error('[ME_PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
