// Lihat daftar user beserta status kelayakan SSO.
// Jalankan: npx tsx scripts/list-users.ts
import 'dotenv/config'
import { prisma } from '@/lib/prisma'

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true,
      status: true,
      isGuest: true,
      deletedAt: true,
      company: { select: { name: true, isActive: true, deletedAt: true } },
    },
    orderBy: { email: 'asc' },
  })

  console.log(`${users.length} user terdaftar\n`)
  for (const u of users) {
    const blocked =
      u.deletedAt ? 'deleted'
      : u.status !== 'ACTIVE' ? `status=${u.status}`
      : u.isGuest ? 'guest'
      : u.role !== 'SUPER_ADMIN' && u.company && (u.company.deletedAt || !u.company.isActive) ? 'company nonaktif'
      : null
    console.log(
      `${blocked ? 'TOLAK ' : 'BOLEH '} ${u.email.padEnd(34)} ${u.role.padEnd(18)} ${u.company?.name ?? '-'}${blocked ? `  (${blocked})` : ''}`,
    )
  }
  await prisma.$disconnect()
}

main()
