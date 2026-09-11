import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

const PASSWORD_HASH = bcrypt.hashSync('Demo12345', 12)

async function run() {
  console.log('--- Setting up exact divisions: IT Operasional, Marketing, HRBP (10 accounts per tenant) ---')

  const now = new Date()

  // 1. Ambil kedua tenant
  let sobat = await prisma.company.findFirst({
    where: { name: { in: ['SOBAT UMKM PRO', 'SobatUMKM pro', 'Sobat UMKM Pro'] } },
  })
  if (!sobat) {
    sobat = await prisma.company.create({
      data: {
        name: 'SobatUMKM pro',
        uniqueCode: 'SBUP',
        subscription: 'PREMIUM',
        isActive: true,
      },
    })
  } else {
    await prisma.company.update({
      where: { id: sobat.id },
      data: { name: 'SobatUMKM pro', deletedAt: null, isActive: true },
    })
  }

  let randumart = await prisma.company.findFirst({
    where: { name: 'Randumart' },
  })
  if (!randumart) {
    randumart = await prisma.company.create({
      data: {
        name: 'Randumart',
        uniqueCode: 'RANDU',
        subscription: 'PREMIUM',
        isActive: true,
      },
    })
  } else {
    await prisma.company.update({
      where: { id: randumart.id },
      data: { deletedAt: null, isActive: true },
    })
  }

  const validCompanyIds = [sobat.id, randumart.id]

  // Soft-delete perusahaan & user lain
  await prisma.company.updateMany({
    where: { id: { notIn: validCompanyIds }, deletedAt: null },
    data: { deletedAt: now },
  })

  await prisma.user.updateMany({
    where: {
      role: { not: 'SUPER_ADMIN' },
      OR: [{ companyId: { notIn: validCompanyIds } }, { companyId: null }],
      deletedAt: null,
    },
    data: { deletedAt: now },
  })

  // 2. Setup Divisi per Tenant: IT Operasional, Marketing, HRBP
  const TARGET_DIVISIONS = [
    { name: 'IT Operasional', description: 'Pengembangan teknologi, integrasi sistem, dan operasional teknis' },
    { name: 'Marketing', description: 'Strategi pemasaran, akuisisi mitra/pelanggan, dan kampanye produk' },
    { name: 'HRBP', description: 'Pengembangan talenta, kepatuhan SDM, dan budaya organisasi' },
  ]

  async function syncDivisions(companyId: string) {
    const divMap: Record<string, string> = {}

    // Bersihkan divisi lama yang bukan salah satu dari 3 ini
    const oldDivs = await prisma.division.findMany({
      where: { companyId },
    })
    for (const d of oldDivs) {
      const match = TARGET_DIVISIONS.find((t) => t.name.toLowerCase() === d.name.toLowerCase())
      if (match) {
        // Update nama agar exact casing
        await prisma.division.update({
          where: { id: d.id },
          data: { name: match.name, description: match.description, deletedAt: null },
        })
        divMap[match.name] = d.id
      } else {
        await prisma.division.update({
          where: { id: d.id },
          data: { deletedAt: now },
        })
      }
    }

    for (const target of TARGET_DIVISIONS) {
      if (!divMap[target.name]) {
        const created = await prisma.division.create({
          data: {
            name: target.name,
            description: target.description,
            companyId,
          },
        })
        divMap[target.name] = created.id
      }
    }

    return divMap
  }

  const sobatDivs = await syncDivisions(sobat.id)
  const randuDivs = await syncDivisions(randumart.id)

  console.log('Divisions synced for SobatUMKM pro and Randumart.')

  // 3. SEED SOBAT UMKM PRO (10 AKUN)
  const sobatAccounts = [
    { email: 'admin.sobat@promap.id', name: 'Rahmat Hidayat (Admin Ops)', role: 'ADMIN_OPERATIONAL', divId: null },
    { email: 'hendra.sobat@promap.id', name: 'Hendra Wijaya', role: 'MANAGER', divId: sobatDivs['IT Operasional'] },
    { email: 'siti.sobat@promap.id', name: 'Siti Nurhaliza', role: 'MANAGER', divId: sobatDivs['Marketing'] },
    { email: 'ratna.sobat@promap.id', name: 'Ratna Kusuma', role: 'MANAGER', divId: sobatDivs['HRBP'] },
    { email: 'inoru@gmail.com', name: 'Inoru', role: 'PIC', divId: sobatDivs['IT Operasional'] },
    { email: 'dimas.sobat@promap.id', name: 'Dimas Setiawan', role: 'PIC', divId: sobatDivs['IT Operasional'] },
    { email: 'dewi.sobat@promap.id', name: 'Dewi Sartika', role: 'PIC', divId: sobatDivs['Marketing'] },
    { email: 'anisa.sobat@promap.id', name: 'Anisa Rahma', role: 'PIC', divId: sobatDivs['Marketing'] },
    { email: 'fajar.sobat@promap.id', name: 'Fajar Ramadhan', role: 'PIC', divId: sobatDivs['HRBP'] },
    { email: 'putri.sobat@promap.id', name: 'Putri Wulandari', role: 'PIC', divId: sobatDivs['HRBP'] },
  ] as const

  const sobatUserMap: Record<string, any> = {}
  for (const acc of sobatAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        name: acc.name,
        companyId: sobat.id,
        divisionId: acc.divId,
        role: acc.role as any,
        status: 'ACTIVE',
        deletedAt: null,
        password: PASSWORD_HASH,
      },
      create: {
        name: acc.name,
        email: acc.email,
        password: PASSWORD_HASH,
        role: acc.role as any,
        status: 'ACTIVE',
        companyId: sobat.id,
        divisionId: acc.divId,
      },
    })
    sobatUserMap[acc.email] = user
  }

  // 4. SEED RANDUMART (10 AKUN)
  const randuAccounts = [
    { email: 'admin.randumart@promap.id', name: 'Agus Santoso (Admin Ops)', role: 'ADMIN_OPERATIONAL', divId: null },
    { email: 'citra.randumart@promap.id', name: 'Citra Ayu', role: 'MANAGER', divId: randuDivs['IT Operasional'] },
    { email: 'dian.randumart@promap.id', name: 'Dian Sastro', role: 'MANAGER', divId: randuDivs['Marketing'] },
    { email: 'bambang.randumart@promap.id', name: 'Bambang Hidayat', role: 'MANAGER', divId: randuDivs['HRBP'] },
    { email: 'farhan.randumart@promap.id', name: 'Farhan Pratama', role: 'PIC', divId: randuDivs['IT Operasional'] },
    { email: 'kevin.randumart@promap.id', name: 'Kevin Sanjaya', role: 'PIC', divId: randuDivs['IT Operasional'] },
    { email: 'nadia.randumart@promap.id', name: 'Nadia Kusuma', role: 'PIC', divId: randuDivs['Marketing'] },
    { email: 'lisa.randumart@promap.id', name: 'Lisa Anggraini', role: 'PIC', divId: randuDivs['Marketing'] },
    { email: 'bayu.randumart@promap.id', name: 'Bayu Saputra', role: 'PIC', divId: randuDivs['HRBP'] },
    { email: 'taufik.randumart@promap.id', name: 'Taufik Ismail', role: 'PIC', divId: randuDivs['HRBP'] },
  ] as const

  const randuUserMap: Record<string, any> = {}
  for (const acc of randuAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        name: acc.name,
        companyId: randumart.id,
        divisionId: acc.divId,
        role: acc.role as any,
        status: 'ACTIVE',
        deletedAt: null,
        password: PASSWORD_HASH,
      },
      create: {
        name: acc.name,
        email: acc.email,
        password: PASSWORD_HASH,
        role: acc.role as any,
        status: 'ACTIVE',
        companyId: randumart.id,
        divisionId: acc.divId,
      },
    })
    randuUserMap[acc.email] = user
  }

  // 5. Perbarui divisi task & project existing agar konsisten dengan 3 divisi baru
  // SobatUMKM: update project division
  await prisma.project.updateMany({
    where: { companyId: sobat.id, divisionId: { not: null } },
    data: { divisionId: sobatDivs['IT Operasional'] },
  })
  await prisma.task.updateMany({
    where: { project: { companyId: sobat.id } },
    data: { divisionId: sobatDivs['IT Operasional'] },
  })

  // Randumart: update project division
  await prisma.project.updateMany({
    where: { companyId: randumart.id, divisionId: { not: null } },
    data: { divisionId: randuDivs['IT Operasional'] },
  })
  await prisma.task.updateMany({
    where: { project: { companyId: randumart.id } },
    data: { divisionId: randuDivs['IT Operasional'] },
  })

  console.log('--- Successfully seeded 10 accounts per tenant with IT Operasional, Marketing, HRBP! ---')
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
