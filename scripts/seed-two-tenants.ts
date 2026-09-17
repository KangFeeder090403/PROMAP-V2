import 'dotenv/config'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import type { ActionPlanStatus, Priority, ProposalStatus } from '../lib/generated/prisma/client'

const PASSWORD_HASH = bcrypt.hashSync('Demo12345', 12)
const SUPER_ADMIN_HASH = bcrypt.hashSync('Superadmin123', 12)

async function run() {
  console.log('=== SEEDING COMPREHENSIVE DATA: SobatUMKM pro, Randumart, SuperAdmin, Projects, Tasks, APs ===')

  const now = new Date()

  // 1. SUPER ADMIN ACCOUNTS
  const superAdmins = [
    { email: 'admin@promap.com', name: 'Super Admin', password: SUPER_ADMIN_HASH },
    { email: 'vito@promap.com', name: 'Vito (Super Admin)', password: PASSWORD_HASH },
  ]

  for (const sa of superAdmins) {
    await prisma.user.upsert({
      where: { email: sa.email },
      update: {
        name: sa.name,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        deletedAt: null,
        password: sa.password,
      },
      create: {
        email: sa.email,
        name: sa.name,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        password: sa.password,
      },
    })
  }
  console.log('✓ Super Admin accounts configured: admin@promap.com & vito@promap.com')

  // 2. SETUP COMPANIES: SobatUMKM pro & Randumart
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

  // Soft-delete perusahaan lain agar switcher hanya fokus pada 2 tenant
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

  // 3. SETUP DIVISIONS: IT Operasional, Marketing, HRBP
  const TARGET_DIVISIONS = [
    { name: 'IT Operasional', description: 'Pengembangan teknologi, integrasi sistem, dan operasional teknis' },
    { name: 'Marketing', description: 'Strategi pemasaran, akuisisi mitra/pelanggan, dan kampanye produk' },
    { name: 'HRBP', description: 'Pengembangan talenta, kepatuhan SDM, dan budaya organisasi' },
  ]

  async function syncDivisions(companyId: string) {
    const divMap: Record<string, string> = {}
    const oldDivs = await prisma.division.findMany({ where: { companyId } })
    for (const d of oldDivs) {
      const match = TARGET_DIVISIONS.find((t) => t.name.toLowerCase() === d.name.toLowerCase())
      if (match) {
        await prisma.division.update({
          where: { id: d.id },
          data: { name: match.name, description: match.description, deletedAt: null },
        })
        divMap[match.name] = d.id
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
  console.log('✓ Divisions synced (IT Operasional, Marketing, HRBP)')

  // 4. SETUP USER LABELS
  async function syncLabels(companyId: string) {
    const labels = ['Karyawan Tetap', 'Kontrak', 'Magang / Intern']
    const labelMap: Record<string, string> = {}
    for (const name of labels) {
      const existing = await prisma.userLabel.findFirst({
        where: { companyId, name, deletedAt: null },
      })
      if (existing) {
        labelMap[name] = existing.id
      } else {
        const created = await prisma.userLabel.create({
          data: { companyId, name, status: 'ACTIVE' },
        })
        labelMap[name] = created.id
      }
    }
    return labelMap
  }

  const sobatLabels = await syncLabels(sobat.id)
  const randuLabels = await syncLabels(randumart.id)

  // 5. SEED ACCOUNTS: SobatUMKM pro (11 AKUN termasuk Inoru & Vito sebagai PIC)
  const sobatAccounts = [
    { email: 'admin.sobat@promap.id', name: 'Rahmat Hidayat (Admin Ops)', role: 'ADMIN_OPERATIONAL', divId: null, label: 'Karyawan Tetap' },
    { email: 'hendra.sobat@promap.id', name: 'Hendra Wijaya', role: 'MANAGER', divId: sobatDivs['IT Operasional'], label: 'Karyawan Tetap' },
    { email: 'siti.sobat@promap.id', name: 'Siti Nurhaliza', role: 'MANAGER', divId: sobatDivs['Marketing'], label: 'Karyawan Tetap' },
    { email: 'ratna.sobat@promap.id', name: 'Ratna Kusuma', role: 'MANAGER', divId: sobatDivs['HRBP'], label: 'Karyawan Tetap' },
    { email: 'inoru@gmail.com', name: 'Inoru (PIC)', role: 'PIC', divId: sobatDivs['IT Operasional'], label: 'Karyawan Tetap' },
    { email: 'vito.sobat@promap.id', name: 'Vito Alfariz (PIC)', role: 'PIC', divId: sobatDivs['IT Operasional'], label: 'Karyawan Tetap' },
    { email: 'dimas.sobat@promap.id', name: 'Dimas Setiawan', role: 'PIC', divId: sobatDivs['IT Operasional'], label: 'Karyawan Tetap' },
    { email: 'dewi.sobat@promap.id', name: 'Dewi Sartika', role: 'PIC', divId: sobatDivs['Marketing'], label: 'Karyawan Tetap' },
    { email: 'anisa.sobat@promap.id', name: 'Anisa Rahma', role: 'PIC', divId: sobatDivs['Marketing'], label: 'Kontrak' },
    { email: 'fajar.sobat@promap.id', name: 'Fajar Ramadhan', role: 'PIC', divId: sobatDivs['HRBP'], label: 'Karyawan Tetap' },
    { email: 'putri.sobat@promap.id', name: 'Putri Wulandari', role: 'PIC', divId: sobatDivs['HRBP'], label: 'Magang / Intern' },
  ] as const

  const sobatUserMap: Record<string, any> = {}
  for (const acc of sobatAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        name: acc.name,
        companyId: sobat.id,
        divisionId: acc.divId,
        userLabelId: sobatLabels[acc.label] ?? null,
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
        userLabelId: sobatLabels[acc.label] ?? null,
      },
    })
    sobatUserMap[acc.email] = user
  }

  // 6. SEED ACCOUNTS: Randumart (10 AKUN)
  const randuAccounts = [
    { email: 'admin.randumart@promap.id', name: 'Agus Santoso (Admin Ops)', role: 'ADMIN_OPERATIONAL', divId: null, label: 'Karyawan Tetap' },
    { email: 'citra.randumart@promap.id', name: 'Citra Ayu', role: 'MANAGER', divId: randuDivs['IT Operasional'], label: 'Karyawan Tetap' },
    { email: 'dian.randumart@promap.id', name: 'Dian Sastro', role: 'MANAGER', divId: randuDivs['Marketing'], label: 'Karyawan Tetap' },
    { email: 'bambang.randumart@promap.id', name: 'Bambang Hidayat', role: 'MANAGER', divId: randuDivs['HRBP'], label: 'Karyawan Tetap' },
    { email: 'farhan.randumart@promap.id', name: 'Farhan Pratama', role: 'PIC', divId: randuDivs['IT Operasional'], label: 'Karyawan Tetap' },
    { email: 'kevin.randumart@promap.id', name: 'Kevin Sanjaya', role: 'PIC', divId: randuDivs['IT Operasional'], label: 'Karyawan Tetap' },
    { email: 'nadia.randumart@promap.id', name: 'Nadia Kusuma', role: 'PIC', divId: randuDivs['Marketing'], label: 'Karyawan Tetap' },
    { email: 'lisa.randumart@promap.id', name: 'Lisa Anggraini', role: 'PIC', divId: randuDivs['Marketing'], label: 'Kontrak' },
    { email: 'bayu.randumart@promap.id', name: 'Bayu Saputra', role: 'PIC', divId: randuDivs['HRBP'], label: 'Karyawan Tetap' },
    { email: 'taufik.randumart@promap.id', name: 'Taufik Ismail', role: 'PIC', divId: randuDivs['HRBP'], label: 'Magang / Intern' },
  ] as const

  const randuUserMap: Record<string, any> = {}
  for (const acc of randuAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        name: acc.name,
        companyId: randumart.id,
        divisionId: acc.divId,
        userLabelId: randuLabels[acc.label] ?? null,
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
        userLabelId: randuLabels[acc.label] ?? null,
      },
    })
    randuUserMap[acc.email] = user
  }
  console.log('✓ Accounts seeded for SobatUMKM pro (11 users) & Randumart (10 users)')

  // 7. SEED PROJECTS & KANBAN TASKS
  console.log('Seeding Projects & Kanban Tasks...')
  const adminOpsSobat = sobatUserMap['admin.sobat@promap.id']
  const adminOpsRandu = randuUserMap['admin.randumart@promap.id']

  const sobatProjectsData = [
    {
      name: 'Pengembangan Portal Onboarding UMKM Digital 2026',
      description: 'Platform katalog digital, validasi merchant NIB, dan sinkronisasi pembayaran QRIS',
      divisionId: sobatDivs['IT Operasional'],
      tasks: [
        { title: 'Setup Sandbox Payment Gateway QRIS & VA', pic: 'inoru@gmail.com', status: 'COMPLETE', priority: 'HIGH' },
        { title: 'Uji Penetrasi & Audit Keamanan Akses Portal', pic: 'vito.sobat@promap.id', status: 'IN_PROGRESS', priority: 'HIGH' },
        { title: 'Integrasi WhatsApp Automated Order & Notifikasi', pic: 'dimas.sobat@promap.id', status: 'PENDING_APPROVAL', priority: 'MEDIUM' },
        { title: 'Optimasi Cache & Response Time Checkout', pic: 'inoru@gmail.com', status: 'NOT_STARTED', priority: 'LOW' },
      ],
    },
    {
      name: 'Kampanye & Akselerasi Merchant Lokal Q3-Q4',
      description: 'Program promosi produk unggulan UMKM, kurasi katalog, dan training live commerce',
      divisionId: sobatDivs['Marketing'],
      tasks: [
        { title: 'Finalisasi Kurasi 100 Produk Unggulan Merchant', pic: 'dewi.sobat@promap.id', status: 'APPROVED', priority: 'HIGH' },
        { title: 'Penyusunan Materi Webinar Copywriting & Konten', pic: 'anisa.sobat@promap.id', status: 'COMPLETE', priority: 'MEDIUM' },
        { title: 'Peluncuran Promo Diskon Ongkir Kemitraan', pic: 'dewi.sobat@promap.id', status: 'IN_PROGRESS', priority: 'HIGH' },
      ],
    },
    {
      name: 'Standardisasi Kinerja & Pembinaan Merchant UMKM',
      description: 'Pendampingan berkelanjutan, evaluasi SOP, dan pengukuran kepuasan merchant',
      divisionId: sobatDivs['HRBP'],
      tasks: [
        { title: 'Penyusunan Pedoman Evaluasi CSAT Merchant 2026', pic: 'fajar.sobat@promap.id', status: 'IN_PROGRESS', priority: 'MEDIUM' },
        { title: 'Training Pendamping Lapangan Kloter 1', pic: 'putri.sobat@promap.id', status: 'COMPLETE', priority: 'HIGH' },
      ],
    },
  ]

  for (const pData of sobatProjectsData) {
    let proj = await prisma.project.findFirst({
      where: { companyId: sobat.id, name: pData.name, deletedAt: null },
    })
    if (!proj) {
      proj = await prisma.project.create({
        data: {
          name: pData.name,
          description: pData.description,
          companyId: sobat.id,
          divisionId: pData.divisionId,
          createdById: adminOpsSobat.id,
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-11-30'),
        },
      })
    }

    for (const t of pData.tasks) {
      const picUser = sobatUserMap[t.pic]
      if (!picUser) continue
      const existingTask = await prisma.task.findFirst({
        where: { projectId: proj.id, title: t.title, deletedAt: null },
      })
      if (!existingTask) {
        await prisma.task.create({
          data: {
            title: t.title,
            projectId: proj.id,
            divisionId: pData.divisionId,
            picId: picUser.id,
            createdById: adminOpsSobat.id,
            priority: t.priority as Priority,
            status: t.status as ActionPlanStatus,
            startDate: new Date('2026-09-10'),
            endDate: new Date('2026-10-05'),
          },
        })
      }
    }
  }

  // Randumart Projects & Tasks
  const randuProjectsData = [
    {
      name: 'Modernisasi POS & Integrasi Omnichannel Retail',
      description: 'Migrasi sistem kasir cloud gerai Randumart dan sinkronisasi stok real-time',
      divisionId: randuDivs['IT Operasional'],
      tasks: [
        { title: 'Deploy Sistem Kasir POS Cloud v2 ke 15 Gerai', pic: 'farhan.randumart@promap.id', status: 'IN_PROGRESS', priority: 'HIGH' },
        { title: 'Sinkronisasi Database Inventori Gudang Utama', pic: 'kevin.randumart@promap.id', status: 'PENDING_APPROVAL', priority: 'HIGH' },
      ],
    },
    {
      name: 'Program Loyalitas Pelanggan & Promo Tematik',
      description: 'Aplikasi member card dan promosi belanja mingguan',
      divisionId: randuDivs['Marketing'],
      tasks: [
        { title: 'Rilis Skema Poin Member Tematik Akhir Pekan', pic: 'nadia.randumart@promap.id', status: 'COMPLETE', priority: 'MEDIUM' },
        { title: 'Pengadaan Materi Cetak Banner Promo di Toko', pic: 'lisa.randumart@promap.id', status: 'IN_PROGRESS', priority: 'LOW' },
      ],
    },
  ]

  for (const pData of randuProjectsData) {
    let proj = await prisma.project.findFirst({
      where: { companyId: randumart.id, name: pData.name, deletedAt: null },
    })
    if (!proj) {
      proj = await prisma.project.create({
        data: {
          name: pData.name,
          description: pData.description,
          companyId: randumart.id,
          divisionId: pData.divisionId,
          createdById: adminOpsRandu.id,
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-12-31'),
        },
      })
    }

    for (const t of pData.tasks) {
      const picUser = randuUserMap[t.pic]
      if (!picUser) continue
      const existingTask = await prisma.task.findFirst({
        where: { projectId: proj.id, title: t.title, deletedAt: null },
      })
      if (!existingTask) {
        await prisma.task.create({
          data: {
            title: t.title,
            projectId: proj.id,
            divisionId: pData.divisionId,
            picId: picUser.id,
            createdById: adminOpsRandu.id,
            priority: t.priority as Priority,
            status: t.status as ActionPlanStatus,
            startDate: new Date('2026-09-15'),
            endDate: new Date('2026-10-15'),
          },
        })
      }
    }
  }
  console.log('✓ Projects & Kanban Tasks seeded for both tenants')

  // 8. SEED ACTION PLANS FROM CSV & RICH DEMO
  console.log('Seeding Action Plans & Checklists for SobatUMKM pro...')
  const csvPath = path.join(process.cwd(), 'import-action-plans-sobatumkm-2026.csv')
  if (fs.existsSync(csvPath)) {
    const raw = fs.readFileSync(csvPath, 'utf-8')
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0 && !l.startsWith('sep='))
    const header = lines[0].split(',')

    // Status distribution cycle to provide rich visual variety across tabs
    const statusCycle: ActionPlanStatus[] = [
      'IN_PROGRESS',
      'PENDING_APPROVAL',
      'COMPLETE',
      'EVIDENCE_REQUIRED',
      'OVERDUE',
      'APPROVED',
      'NOT_STARTED',
    ]

    let apCount = 0
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      // Regex parsing for CSV lines with commas inside quotes
      const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)
      if (!match || match.length < 6) continue

      const cols = match.map((m) => m.replace(/^,/, '').replace(/^"/, '').replace(/"$/, '').trim())
      const [title, outcomeKpi, priority, start, end, picEmail] = cols

      // Map PIC: fallback to Inoru or Vito if match
      let user = sobatUserMap[picEmail]
      if (!user) {
        user = i % 2 === 0 ? sobatUserMap['vito.sobat@promap.id'] : sobatUserMap['inoru@gmail.com']
      }

      const assignedStatus = statusCycle[i % statusCycle.length]
      const evidence = assignedStatus === 'PENDING_APPROVAL' || assignedStatus === 'APPROVED' || assignedStatus === 'COMPLETE'
        ? `https://drive.google.com/file/d/sobatumkm-evidence-${i}.pdf`
        : null

      const existing = await prisma.actionPlan.findFirst({
        where: { companyId: sobat.id, title, deletedAt: null },
      })

      let apId = existing?.id
      if (!existing) {
        const createdAp = await prisma.actionPlan.create({
          data: {
            title,
            outcomeKpi: outcomeKpi || 'Target KPI operasional 100% tercapai',
            status: assignedStatus,
            priority: (priority as Priority) || 'MEDIUM',
            startDate: new Date(start || '2026-09-20'),
            endDate: new Date(end || '2026-09-30'),
            picId: user.id,
            companyId: sobat.id,
            divisionId: user.divisionId,
            evidenceLink: evidence,
            reviewNote: assignedStatus === 'EVIDENCE_REQUIRED' ? 'Mohon lampirkan dokumen foto dan rekapitulasi data verifikasi.' : null,
          },
        })
        apId = createdAp.id
        apCount++
      }

      // Checklists
      if (apId) {
        const existingChecklists = await prisma.checklist.count({ where: { actionPlanId: apId } })
        if (existingChecklists === 0) {
          const checklistItems = [
            { title: 'Persiapan dokumen pendukung & approval awal', isDone: true },
            { title: 'Koordinasi lintas tim dan sosialisasi SOP', isDone: assignedStatus !== 'NOT_STARTED' },
            { title: 'Eksekusi program lapangan & verifikasi output', isDone: assignedStatus === 'COMPLETE' || assignedStatus === 'APPROVED' },
            { title: 'Penyusunan laporan akhir & upload bukti pendukung', isDone: assignedStatus === 'COMPLETE' },
          ]
          for (const item of checklistItems) {
            await prisma.checklist.create({
              data: { actionPlanId: apId, title: item.title, isDone: item.isDone },
            })
          }
        }
      }
    }
    console.log(`✓ Seeded ${apCount} action plans with checklists for SobatUMKM pro`)
  }

  // 9. SEED ACTION PLANS FOR RANDUMART
  const randuAPs = [
    { title: 'Integrasi Barcode Scanner Mobile di Seluruh Gerai', kpi: '100% kasir bisa scan barcode via handheld', pic: 'farhan.randumart@promap.id', status: 'IN_PROGRESS', priority: 'HIGH', div: randuDivs['IT Operasional'] },
    { title: 'Audit Keamanan Data Transaksi Pembayaran Pelanggan', kpi: 'Lolos sertifikasi keamanan berkala', pic: 'kevin.randumart@promap.id', status: 'PENDING_APPROVAL', priority: 'HIGH', div: randuDivs['IT Operasional'] },
    { title: 'Kampanye Promo Belanja Mingguan Super Hemat', kpi: 'Trafik gerai naik 25%', pic: 'nadia.randumart@promap.id', status: 'COMPLETE', priority: 'MEDIUM', div: randuDivs['Marketing'] },
    { title: 'Survei Kepuasan Pelanggan Gerai Jawa Barat', kpi: 'Skor CSAT minimal 4.5', pic: 'lisa.randumart@promap.id', status: 'APPROVED', priority: 'LOW', div: randuDivs['Marketing'] },
    { title: 'Pelatihan Pelayanan Prima Kasir & Pramuniaga Baru', kpi: '30 staf terlatih & tersertifikasi', pic: 'bayu.randumart@promap.id', status: 'IN_PROGRESS', priority: 'MEDIUM', div: randuDivs['HRBP'] },
    { title: 'Peninjauan Ulang Benefit & Asuransi Kesehatan Karyawan', kpi: 'Paket benefit 2027 disahkan direksi', pic: 'taufik.randumart@promap.id', status: 'OVERDUE', priority: 'HIGH', div: randuDivs['HRBP'] },
  ] as const

  for (const ap of randuAPs) {
    const user = randuUserMap[ap.pic]
    if (!user) continue
    const existing = await prisma.actionPlan.findFirst({
      where: { companyId: randumart.id, title: ap.title, deletedAt: null },
    })
    if (!existing) {
      const createdAp = await prisma.actionPlan.create({
        data: {
          title: ap.title,
          outcomeKpi: ap.kpi,
          status: ap.status as ActionPlanStatus,
          priority: ap.priority as Priority,
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-09-30'),
          picId: user.id,
          companyId: randumart.id,
          divisionId: ap.div,
          evidenceLink: ap.status === 'COMPLETE' || ap.status === 'PENDING_APPROVAL' ? 'https://docs.randumart.co.id/evidence.pdf' : null,
        },
      })
      await prisma.checklist.createMany({
        data: [
          { actionPlanId: createdAp.id, title: 'Kajian kebutuhan & alokasi anggaran', isDone: true },
          { actionPlanId: createdAp.id, title: 'Implementasi langkah teknis', isDone: ap.status !== 'NOT_STARTED' },
          { actionPlanId: createdAp.id, title: 'Validasi & penyerahan hasil kerja', isDone: ap.status === 'COMPLETE' },
        ],
      })
    }
  }
  console.log('✓ Action Plans seeded for Randumart')

  // 10. SEED PROPOSALS
  const proposals = [
    {
      title: 'Proposal Implementasi AI Analytics untuk Prediksi Penjualan UMKM',
      description: 'Otomatisasi peramalan stok dan tren produk terlaris merchant berbasis data transaksi historis',
      status: 'SUBMITTED' as ProposalStatus,
      proposerEmail: 'inoru@gmail.com',
    },
    {
      title: 'Proposal Program Subsidi Ongkos Kirim Antar Kota Merchant',
      description: 'Skema cashback ongkir bersama 3 ekspedisi nasional untuk mendorong volume pesanan luar pulau',
      status: 'SUBMITTED' as ProposalStatus,
      proposerEmail: 'dewi.sobat@promap.id',
    },
    {
      title: 'Proposal Penyelenggaraan Workshop Sertifikasi Halal Gratis',
      description: 'Program pendampingan regulasi halal bagi 50 merchant makanan dan minuman binaan',
      status: 'APPROVED' as ProposalStatus,
      proposerEmail: 'dimas.sobat@promap.id',
    },
    {
      title: 'Gagasan Revamp Desain Kemasan Ramah Lingkungan',
      description: 'Inisiatif kemasan daur ulang untuk produk kurasi — draft konsep awal',
      status: 'DRAFT' as ProposalStatus,
      proposerEmail: 'vito.sobat@promap.id',
    },
    {
      title: 'Proposal Sistem Self-Checkout Gerai Flagship Randumart',
      description: 'Implementasi pilot project 2 unit self-checkout terminal di gerai Bandung',
      status: 'SUBMITTED' as ProposalStatus,
      proposerEmail: 'farhan.randumart@promap.id',
    },
  ]

  for (const prop of proposals) {
    const user = sobatUserMap[prop.proposerEmail] || randuUserMap[prop.proposerEmail]
    if (!user) continue
    const existing = await prisma.proposal.findFirst({
      where: { title: prop.title, proposerId: user.id },
    })
    if (!existing) {
      await prisma.proposal.create({
        data: {
          title: prop.title,
          description: prop.description,
          status: prop.status,
          proposerId: user.id,
          reviewNote: prop.status === 'APPROVED' ? 'Disetujui. Silakan lanjut koordinasi anggaran bersama Finance.' : null,
        },
      })
    }
  }
  console.log('✓ Proposals seeded for both tenants')

  console.log('\n======================================================')
  console.log('🎉 ALL DATA FULLY SEEDED!')
  console.log('Kredensial:')
  console.log('  1. Super Admin:')
  console.log('     - admin@promap.com / Superadmin123')
  console.log('     - vito@promap.com / Demo12345 (Vito Super Admin)')
  console.log('  2. SobatUMKM pro:')
  console.log('     - Inoru (PIC): inoru@gmail.com / Demo12345')
  console.log('     - Vito Alfariz (PIC): vito.sobat@promap.id / Demo12345')
  console.log('     - Admin Ops: admin.sobat@promap.id / Demo12345')
  console.log('     - Manager IT: hendra.sobat@promap.id / Demo12345')
  console.log('  3. Randumart:')
  console.log('     - Admin Ops: admin.randumart@promap.id / Demo12345')
  console.log('     - Manager IT: citra.randumart@promap.id / Demo12345')
  console.log('======================================================')
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
