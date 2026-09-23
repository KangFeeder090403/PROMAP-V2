import { prisma } from '@/lib/prisma'
import { companyScope, divisionScope } from '@/lib/rbac'
import type { User } from '@/lib/generated/prisma/client'
import { unstable_cache } from 'next/cache'

export async function fetchSettingsInitialDataRaw(user: User) {
  const isSuperAdmin = user.role === 'SUPER_ADMIN'

  const userWhere: Record<string, unknown> =
    user.role === 'ADMIN_OPERATIONAL' || user.role === 'MANAGER'
      ? { companyId: user.companyId }
      : user.role === 'PIC'
      ? { companyId: user.companyId, status: 'ACTIVE' }
      : {}

  const userLabelWhere: Record<string, unknown> =
    user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId! }

  const [companies, divisions, users, userLabels, leads] = await Promise.all([
    prisma.company.findMany({
      where: { ...companyScope(user), deletedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.division.findMany({
      where: { ...divisionScope(user), deletedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { ...userWhere, deletedAt: null },
      select: {
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
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userLabel.findMany({
      where: { ...userLabelWhere, deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    isSuperAdmin
      ? prisma.lead.findMany({
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ])

  return {
    companies,
    divisions,
    users,
    userLabels,
    leads,
  }
}

export async function getSettingsInitialData(user: User) {
  const cacheKey = [
    'settings-initial',
    user.role,
    user.companyId ?? 'all',
    user.divisionId ?? 'all',
    user.id,
  ]

  return unstable_cache(
    async () => fetchSettingsInitialDataRaw(user),
    cacheKey,
    {
      revalidate: 60,
      tags: [`settings-${user.companyId ?? 'all'}`],
    }
  )()
}
