import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

function assert(cond: boolean, label: string) {
  if (!cond) throw new Error(`FAIL: ${label}`)
  console.log(`  ✓ ${label}`)
}

async function main() {
  const budi = (await prisma.user.findUnique({ where: { email: 'budi@promapdemo.com' } }))!
  const rian = (await prisma.user.findUnique({ where: { email: 'rian@promapdemo.com' } }))!

  const budiNotifs = await prisma.notification.findMany({ where: { userId: budi.id } })
  const rianNotifs = await prisma.notification.findMany({ where: { userId: rian.id } })

  console.log('Notifikasi persetujuan:')
  assert(budiNotifs.length >= 6, `Manager Budi punya >= 6 notif — dapat ${budiNotifs.length}`)
  assert(rianNotifs.length === 0, `PIC Rian tidak dapat notif approval — dapat ${rianNotifs.length}`)
  assert(budiNotifs.every((n) => n.link?.startsWith('/action-plans?id=')), 'semua notif punya link ke AP')
  assert(budiNotifs.every((n) => n.companyId === budi.companyId), 'notif ter-scope ke company Manager')
  assert(
    budiNotifs.some((n) => n.title === 'Menunggu persetujuan Anda') &&
      budiNotifs.some((n) => n.title === 'Bukti pelaksanaan diminta'),
    'dua jenis notif hadir (persetujuan + bukti)'
  )
  console.log('\nSemua assertion lolos ✓')
}

main()
  .catch((e) => {
    console.error(e.message ?? e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
