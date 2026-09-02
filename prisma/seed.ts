import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@promap.com'
  const name = 'Super Admin'
  const password = await bcrypt.hash('Superadmin123', 12)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Super Admin already exists: ${email}`)
    return
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      // User_Label, Division, dll tidak wajib untuk Super Admin
    },
  })

  console.log(`Created Super Admin: ${user.email} / Superadmin123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
