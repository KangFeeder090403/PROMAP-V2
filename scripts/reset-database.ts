import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

// Reset database: hapus SELURUH data, sisakan satu SUPER_ADMIN.
// HARD DELETE disengaja — ini pembersihan data dummy pra-produksi,
// bukan operasi aplikasi. Aturan soft-delete PRD berlaku untuk runtime.
// Jalankan: npx tsx scripts/reset-database.ts --confirm

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const EMAIL = 'superadmin@gmail.com'
const PASSWORD = 'superadmin'

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.error('Tolak: jalankan dengan --confirm. Operasi ini permanen.')
    process.exit(1)
  }

  // Urutan mengikuti dependensi FK: anak dulu, induk terakhir.
  const steps: [string, () => Promise<{ count: number }>][] = [
    ['Comment', () => prisma.comment.deleteMany()],
    ['Checklist', () => prisma.checklist.deleteMany()],
    ['ActivityLog', () => prisma.activityLog.deleteMany()],
    ['Notification', () => prisma.notification.deleteMany()],
    ['Proposal', () => prisma.proposal.deleteMany()],
    ['ActionPlan', () => prisma.actionPlan.deleteMany()],
    ['Task', () => prisma.task.deleteMany()],
    ['Project', () => prisma.project.deleteMany()],
    ['Lead', () => prisma.lead.deleteMany()],
    ['User', () => prisma.user.deleteMany()],
    ['Division', () => prisma.division.deleteMany()],
    ['UserLabel', () => prisma.userLabel.deleteMany()],
    ['Company', () => prisma.company.deleteMany()],
  ]

  for (const [label, run] of steps) {
    const { count } = await run()
    console.log(`  hapus ${label}: ${count}`)
  }

  await prisma.user.create({
    data: {
      email: EMAIL,
      name: 'Super Admin',
      password: await bcrypt.hash(PASSWORD, 12),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  })

  console.log(`\nSelesai. Super Admin tunggal: ${EMAIL}`)
  console.log('Ganti password ini sebelum deploy produksi.')
}

main()
  .catch((e) => {
    console.error('GAGAL:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
