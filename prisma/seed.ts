import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import type { ActionPlanStatus, Priority } from '../lib/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DEMO_PASSWORD = 'Demo12345'
const DAY = 86_400_000

function at(offsetDays: number, hour = 12) {
  const d = new Date(Date.now() + offsetDays * DAY)
  d.setHours(hour, 0, 0, 0)
  return d
}

type APSeed = {
  title: string
  kpi: string
  status: ActionPlanStatus
  priority: Priority
  picEmail: string
  endDays: number
  hour?: number
  evidence?: string
}

type UserSeed = { email: string; name: string; role: 'MANAGER' | 'PIC' }

type ProposalSeed = { title: string; description: string; status: 'SUBMITTED' | 'DRAFT'; proposerEmail: string }

type CompanySeed = {
  name: string
  uniqueCode: string
  subscription: 'ENTERPRISE' | 'PREMIUM' | 'BASIC'
  division: { name: string; description: string }
  users: UserSeed[]
  actionPlans: APSeed[]
  proposals: ProposalSeed[]
}

// ─── DATA DEMO LINTAS TENANT ───────────────────────────────────

const demoCompanies: CompanySeed[] = [
  {
    name: 'PT ProMaP Demo',
    uniqueCode: 'DEMO001',
    subscription: 'ENTERPRISE',
    division: {
      name: 'Marketing & Growth',
      description: 'Strategi pemasaran, brand, dan pertumbuhan bisnis.',
    },
    users: [
      { email: 'budi@promapdemo.com', name: 'Budi Santoso', role: 'MANAGER' },
      { email: 'rian@promapdemo.com', name: 'Rian Aditya', role: 'PIC' },
      { email: 'dinda@promapdemo.com', name: 'Dinda Lestari', role: 'PIC' },
      { email: 'nadia@promapdemo.com', name: 'Nadia Ramadhani', role: 'PIC' },
      { email: 'andi@promapdemo.com', name: 'Andi Pratama', role: 'PIC' },
    ],
    actionPlans: [
      // Rian Aditya — 5 overdue (beban tinggi), 1 jalan, 1 selesai
      { title: 'Percepatan Legalisasi NIB untuk Anak Usaha', kpi: 'NIB terbit untuk 3 anak usaha', status: 'OVERDUE', priority: 'HIGH', picEmail: 'rian@promapdemo.com', endDays: -45 },
      { title: 'Migrasi Basis Data ke Arsitektur Cloud', kpi: 'Downtime migrasi < 30 menit', status: 'OVERDUE', priority: 'MEDIUM', picEmail: 'rian@promapdemo.com', endDays: -30 },
      { title: 'Publikasi Laporan Keuangan Semester I-2026', kpi: 'Laporan terbit sesuai PSLK', status: 'OVERDUE', priority: 'MEDIUM', picEmail: 'rian@promapdemo.com', endDays: -23 },
      { title: 'On-Boarding Ruang Kerja Digital Distributor', kpi: '40 distributor aktif bulan pertama', status: 'OVERDUE', priority: 'HIGH', picEmail: 'rian@promapdemo.com', endDays: -14 },
      { title: 'Sinkronisasi Data Pelanggan CRM-Produksi', kpi: 'Kecocokan data 100%', status: 'OVERDUE', priority: 'MEDIUM', picEmail: 'rian@promapdemo.com', endDays: -5 },
      { title: 'Framework Keputusan Investasi IT', kpi: 'Framework disetujui Direksi', status: 'IN_PROGRESS', priority: 'MEDIUM', picEmail: 'rian@promapdemo.com', endDays: 16 },
      { title: 'Integrasi Pembayaran Digital Gerai', kpi: '90% gerai pakai QRIS', status: 'COMPLETE', priority: 'MEDIUM', picEmail: 'rian@promapdemo.com', endDays: 5 },
      // Dinda Lestari — 3 review
      { title: 'Finalisasi Kampanye Brand Refresh Q4', kpi: 'Aset terbit sebelum 1 Nov', status: 'PENDING_APPROVAL', priority: 'HIGH', picEmail: 'dinda@promapdemo.com', endDays: 2, evidence: 'https://docs.example.com/brand-refresh-q4.pdf' },
      { title: 'Penyusunan SOP Media Sosial Perusahaan', kpi: 'SOP berlaku per divisi', status: 'PENDING_APPROVAL', priority: 'MEDIUM', picEmail: 'dinda@promapdemo.com', endDays: 4, evidence: 'https://docs.example.com/sop-sosmed.pdf' },
      { title: 'Verifikasi Kompetensi Distributor Sept-2026', kpi: 'Skor kompetensi >= 75', status: 'PENDING_APPROVAL', priority: 'MEDIUM', picEmail: 'dinda@promapdemo.com', endDays: 6, evidence: 'https://docs.example.com/kompetensi-distributor.ods' },
      { title: 'Pelatihan Sales Enablement Produk Baru', kpi: '12 sales tersertifikasi', status: 'IN_PROGRESS', priority: 'MEDIUM', picEmail: 'dinda@promapdemo.com', endDays: 7 },
      { title: 'Kampanye Rabu Hemat Q3', kpi: 'Waste turun 20%, reach +30%', status: 'COMPLETE', priority: 'HIGH', picEmail: 'dinda@promapdemo.com', endDays: 2 },
      { title: 'Roadmap Pemasaran 2027', kpi: 'Roadmap disetujui bulan 11', status: 'APPROVED', priority: 'LOW', picEmail: 'dinda@promapdemo.com', endDays: 10 },
      // Nadia Ramadhani — 4 selesai (optimal)
      { title: 'Automasi Pelaporan Pengiriman', kpi: 'Laporan real-time per gerai', status: 'COMPLETE', priority: 'LOW', picEmail: 'nadia@promapdemo.com', endDays: 1 },
      { title: 'Laporan Bulanan Market Share', kpi: 'Akurasi data 99%', status: 'COMPLETE', priority: 'MEDIUM', picEmail: 'nadia@promapdemo.com', endDays: 4 },
      { title: 'Penyegaran Akses & Audit Keamanan', kpi: 'Nihil temuan kritis', status: 'COMPLETE', priority: 'MEDIUM', picEmail: 'nadia@promapdemo.com', endDays: 6 },
      { title: 'Kajian Pasar Ekspor ASEAN', kpi: '3 negara masuk shortlist', status: 'COMPLETE', priority: 'LOW', picEmail: 'nadia@promapdemo.com', endDays: -25 },
      { title: 'Revamp Landing Page & SEO', kpi: 'Skor CWV hijau, traffic +25%', status: 'IN_PROGRESS', priority: 'MEDIUM', picEmail: 'nadia@promapdemo.com', endDays: 0, hour: 13 },
      { title: 'Rekrutmen Sales Executive Regional', kpi: '2 kandidat bergabung bulan ini', status: 'IN_PROGRESS', priority: 'HIGH', picEmail: 'nadia@promapdemo.com', endDays: 3 },
      // Andi Pratama — campuran: 1 overdue, 1 review, 4 jalan, 2 butuh bukti, dll
      { title: 'Perpanjangan Kontrak Hosting Vendor', kpi: 'Kontrak baru tanpa downtime', status: 'OVERDUE', priority: 'LOW', picEmail: 'andi@promapdemo.com', endDays: -9 },
      { title: 'Persiapan Dokumen Tender Logistik', kpi: 'Dokumen lengkap sebelum deadline', status: 'PENDING_APPROVAL', priority: 'MEDIUM', picEmail: 'andi@promapdemo.com', endDays: 15, evidence: 'https://docs.example.com/tender-logistik.pdf' },
      { title: 'Rekonsiliasi Stok Gudang Bulanan', kpi: 'Selisih inventori < 0,5%', status: 'EVIDENCE_REQUIRED', priority: 'HIGH', picEmail: 'andi@promapdemo.com', endDays: 1, evidence: 'https://docs.example.com/stok-gudang-audit.ods' },
      { title: 'Audit Internal Kepatuhan Lingkungan', kpi: 'Zero temuan mayor', status: 'EVIDENCE_REQUIRED', priority: 'MEDIUM', picEmail: 'andi@promapdemo.com', endDays: 25, evidence: 'https://docs.example.com/audit-lingkungan.pdf' },
      { title: 'Implementasi Modul Inventori Mobile', kpi: 'Rilis v1 untuk 3 gudang', status: 'IN_PROGRESS', priority: 'MEDIUM', picEmail: 'andi@promapdemo.com', endDays: 5 },
      { title: 'Sosialisasi Kebijakan Kerja Hybrid 2026', kpi: 'Sosialisasi ke 100% karyawan', status: 'IN_PROGRESS', priority: 'LOW', picEmail: 'andi@promapdemo.com', endDays: 9 },
      { title: 'Automasi Notifikasi Pelanggan', kpi: 'Ping notifikasi < 5 detik', status: 'IN_PROGRESS', priority: 'MEDIUM', picEmail: 'andi@promapdemo.com', endDays: 13 },
      { title: 'Refresh Website Korporat', kpi: 'Migrasi konten 100%', status: 'IN_PROGRESS', priority: 'LOW', picEmail: 'andi@promapdemo.com', endDays: -40 },
      { title: 'Usulan Kebijakan Pulsa Karyawan', kpi: 'Perhitungan biaya final', status: 'REJECTED', priority: 'MEDIUM', picEmail: 'andi@promapdemo.com', endDays: -6 },
      { title: 'Program Magang Kolaborasi Kampus', kpi: '12 mahasiswa magang', status: 'APPROVED', priority: 'LOW', picEmail: 'andi@promapdemo.com', endDays: 20 },
      { title: 'Penyusunan Rencana Anggaran 2027', kpi: 'RKA disetujui Finance', status: 'NOT_STARTED', priority: 'MEDIUM', picEmail: 'andi@promapdemo.com', endDays: 30 },
      { title: 'Kajian Tren Industri 2027', kpi: 'Whitepaper terbit', status: 'NOT_STARTED', priority: 'LOW', picEmail: 'andi@promapdemo.com', endDays: 60 },
    ],
    proposals: [
      { title: 'Proposal Tools Analisis Data Penjualan Real-time', description: 'Investasi BI dashboard untuk membaca tren harian penjualan lintas gerai.', status: 'SUBMITTED', proposerEmail: 'nadia@promapdemo.com' },
      { title: 'Proposal Program Loyalitas Korporat', description: 'Skema poin & tier untuk pelanggan korporat dengan pembelian berulang.', status: 'SUBMITTED', proposerEmail: 'andi@promapdemo.com' },
      { title: 'Proposal Pelatihan Digital Marketing Internal', description: 'Seri workshop untuk tim inti sebelum kampanye besar Q4.', status: 'SUBMITTED', proposerEmail: 'dinda@promapdemo.com' },
      { title: 'Offsite Flexi Untuk Tim', description: 'Gagasan kegiatan rutin tahunan — masih draft.', status: 'DRAFT', proposerEmail: 'rian@promapdemo.com' },
    ],
  },
  {
    name: 'PT Nusantara Retail',
    uniqueCode: 'DEMO002',
    subscription: 'PREMIUM',
    division: {
      name: 'Retail & Distribusi',
      description: 'Operasional gerai, distribusi barang, dan pengalaman pelanggan.',
    },
    users: [
      { email: 'sari@retaildemo.com', name: 'Sari Wulandari', role: 'MANAGER' },
      { email: 'surya@retaildemo.com', name: 'Surya Nugroho', role: 'PIC' },
      { email: 'mega@retaildemo.com', name: 'Mega Puspita', role: 'PIC' },
    ],
    actionPlans: [
      { title: 'Perpanjangan Sewa Outlet Bandung', kpi: 'Kontrak baru ditandatangani', status: 'OVERDUE', priority: 'HIGH', picEmail: 'surya@retaildemo.com', endDays: -12 },
      { title: 'Rekonsiliasi Stok Gula Regional', kpi: 'Opname tidak ada selisih', status: 'OVERDUE', priority: 'MEDIUM', picEmail: 'surya@retaildemo.com', endDays: -4 },
      { title: 'Promosi Ramadhan 2026', kpi: 'Omzet +18% vs normal', status: 'COMPLETE', priority: 'MEDIUM', picEmail: 'surya@retaildemo.com', endDays: -3 },
      { title: 'Rak Display Musiman', kpi: 'Instalasi di 25 gerai', status: 'IN_PROGRESS', priority: 'MEDIUM', picEmail: 'surya@retaildemo.com', endDays: 5 },
      { title: 'Penambahan 3 Gerai Baru', kpi: 'Gerai buka tepat waktu', status: 'PENDING_APPROVAL', priority: 'HIGH', picEmail: 'surya@retaildemo.com', endDays: 2, evidence: 'https://docs.example.com/proposal-gerai.docx' },
      { title: 'Pelatihan Kasir 2026', kpi: '80 kasir tersertifikasi', status: 'COMPLETE', priority: 'MEDIUM', picEmail: 'mega@retaildemo.com', endDays: -1 },
      { title: 'Monitoring Ulasan Digital', kpi: 'Rating rata-rata 4.5+', status: 'IN_PROGRESS', priority: 'LOW', picEmail: 'mega@retaildemo.com', endDays: 3 },
      { title: 'Audit Harga Kompetitor', kpi: 'Laporan harga mingguan', status: 'EVIDENCE_REQUIRED', priority: 'MEDIUM', picEmail: 'mega@retaildemo.com', endDays: 6, evidence: 'https://docs.example.com/audit-harga.xlsx' },
      { title: 'Program Member Premium', kpi: '1.500 member baru', status: 'NOT_STARTED', priority: 'MEDIUM', picEmail: 'mega@retaildemo.com', endDays: 15 },
    ],
    proposals: [
      { title: 'Proposal Program Member Premium', description: 'Kartu member berbayar dengan benefit prioritas antrean dan diskon eksklusif.', status: 'SUBMITTED', proposerEmail: 'mega@retaildemo.com' },
    ],
  },
  {
    name: 'PT Lintas Logistik',
    uniqueCode: 'DEMO003',
    subscription: 'BASIC',
    division: {
      name: 'Operasional Lapangan',
      description: 'Armada, pergudangan, dan pengiriman lintas kota.',
    },
    users: [
      { email: 'feri@logistikdemo.com', name: 'Feri Gusnadi', role: 'MANAGER' },
      { email: 'joko@logistikdemo.com', name: 'Joko Susilo', role: 'PIC' },
      { email: 'intan@logistikdemo.com', name: 'Intan Permata', role: 'PIC' },
    ],
    actionPlans: [
      { title: 'Sertifikasi Sopir Armada Reguler', kpi: '60 sopir tersertifikasi', status: 'OVERDUE', priority: 'HIGH', picEmail: 'joko@logistikdemo.com', endDays: -20 },
      { title: 'Perawatan Armada Rutin Bulanan', kpi: 'Zero overhaul mendadak', status: 'OVERDUE', priority: 'MEDIUM', picEmail: 'joko@logistikdemo.com', endDays: -7 },
      { title: 'Pemasangan GPS Real-time', kpi: '100% armada terpantau', status: 'IN_PROGRESS', priority: 'HIGH', picEmail: 'joko@logistikdemo.com', endDays: 2 },
      { title: 'Relokasi Gudang Jakarta', kpi: 'Migrasi stok tanpa claim', status: 'COMPLETE', priority: 'MEDIUM', picEmail: 'joko@logistikdemo.com', endDays: -5 },
      { title: 'Kontrak Baru Ekspedisi Jawa', kpi: 'Kontrak ditandatangani', status: 'PENDING_APPROVAL', priority: 'HIGH', picEmail: 'intan@logistikdemo.com', endDays: 3, evidence: 'https://docs.example.com/draft-kontrak-jawa.pdf' },
      { title: 'Dashboard KPI Pengiriman', kpi: 'Go-live dashboard mingguan', status: 'IN_PROGRESS', priority: 'MEDIUM', picEmail: 'intan@logistikdemo.com', endDays: 8 },
      { title: 'Integrasi API Pelanggan Korporat', kpi: 'SLA integrasi 99,9%', status: 'COMPLETE', priority: 'LOW', picEmail: 'intan@logistikdemo.com', endDays: -2 },
      { title: 'Rute Baru Sulawesi', kpi: 'Perintisan 2 kota', status: 'APPROVED', priority: 'MEDIUM', picEmail: 'intan@logistikdemo.com', endDays: 12 },
    ],
    proposals: [
      { title: 'Proposal Sistem Tracking Kiriman Real-time', description: 'Upgrade ke platform tracking yang bisa diakses langsung pelanggan.', status: 'SUBMITTED', proposerEmail: 'joko@logistikdemo.com' },
    ],
  },
]

// ─── SEED ───────────────────────────────────────────────────────

async function upsertSuperAdmin() {
  const email = 'admin@promap.com'
  const name = 'Super Admin'
  const password = await bcrypt.hash('Superadmin123', 12)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Super Admin already exists: ${email}`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      name,
      password,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  })

  console.log(`Created Super Admin: ${email} / Superadmin123`)
}

async function seedDemoCompanies() {
  const existing = await prisma.company.findUnique({ where: { uniqueCode: demoCompanies[0].uniqueCode } })
  if (existing) {
    console.log(`Demo data already exists (${demoCompanies[0].uniqueCode}) — skip`)
    return
  }

  const password = await bcrypt.hash(DEMO_PASSWORD, 12)
  const usersByEmail = new Map<string, { divisionId: string; companyId: string }>()
  let totalAPs = 0
  let totalProposals = 0

  for (const companySeed of demoCompanies) {
    const company = await prisma.company.create({
      data: {
        name: companySeed.name,
        uniqueCode: companySeed.uniqueCode,
        subscription: companySeed.subscription,
        isActive: true,
      },
    })

    const label = await prisma.userLabel.create({
      data: { companyId: company.id, name: 'Karyawan Tetap', status: 'ACTIVE' },
    })

    const division = await prisma.division.create({
      data: {
        name: companySeed.division.name,
        description: companySeed.division.description,
        companyId: company.id,
      },
    })

    for (const u of companySeed.users) {
      const user = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          password,
          role: u.role,
          status: 'ACTIVE',
          companyId: company.id,
          divisionId: division.id,
          userLabelId: label.id,
        },
      })
      usersByEmail.set(u.email, { divisionId: division.id, companyId: company.id })
    }

    for (const ap of companySeed.actionPlans) {
      const scope = usersByEmail.get(ap.picEmail)!
      await prisma.actionPlan.create({
        data: {
          title: ap.title,
          outcomeKpi: ap.kpi,
          status: ap.status,
          priority: ap.priority,
          divisionId: scope.divisionId,
          companyId: scope.companyId,
          picId: (await prisma.user.findUnique({ where: { email: ap.picEmail } }))!.id,
          startDate: ap.endDays < 0 ? at(ap.endDays - 28, 9) : at(ap.endDays - 10, 9),
          endDate: at(ap.endDays, ap.hour ?? 12),
          evidenceLink: ap.evidence ?? null,
        },
      })
      totalAPs += 1
    }

    for (const p of companySeed.proposals) {
      const proposer = (await prisma.user.findUnique({ where: { email: p.proposerEmail } }))!
      await prisma.proposal.create({
        data: {
          title: p.title,
          description: p.description,
          status: p.status,
          proposerId: proposer.id,
        },
      })
      totalProposals += 1
    }

    console.log(`  • ${company.name} (${companySeed.uniqueCode}) — %d AP, %d proposal`, companySeed.actionPlans.length, companySeed.proposals.length)
  }

  console.log(`Demo data seeded: ${demoCompanies.length} tenant, ${totalAPs} action plan, ${totalProposals} proposal`)
  console.log('Credentials (password: ' + DEMO_PASSWORD + '):')
  console.log('  Super Admin : admin@promap.com / Superadmin123 (lihat SEMUA tenant)')
  console.log('  Manager A   : budi@promapdemo.com  (hanya divisi Marketing & Growth)')
  console.log('  Manager B   : sari@retaildemo.com (hanya divisi Retail & Distribusi)')
  console.log('  Manager C   : feri@logistikdemo.com (hanya divisi Operasional)')
  console.log('  PIC contoh  : rian@promapdemo.com, dinda@promapdemo.com, joko@logistikdemo.com')
}

/**
 * Notifikasi demo untuk AP yang menunggu keputusan Manager.
 * Idempoten: hanya membuat baris untuk AP yang belum punya notifikasi.
 * ponytail: dibuat langsung dari status AP karena Notification tidak punya FK ke
 * ActionPlan — kalau nanti butuh relasi sungguhan, tambah kolom di schema dulu.
 */
async function seedApprovalNotifications() {
  const aps = await prisma.actionPlan.findMany({
    where: { status: { in: ['PENDING_APPROVAL', 'EVIDENCE_REQUIRED'] }, deletedAt: null },
    select: { id: true, title: true, status: true, companyId: true, divisionId: true, pic: { select: { name: true } } },
  })

  const existing = new Set(
    (await prisma.notification.findMany({ select: { link: true } })).map((n) => n.link)
  )

  let created = 0
  for (const ap of aps) {
    const link = `/action-plans?id=${ap.id}`
    if (existing.has(link)) continue

    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER', divisionId: ap.divisionId, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    })
    if (managers.length === 0) continue

    const pending = ap.status === 'PENDING_APPROVAL'
    await prisma.notification.createMany({
      data: managers.map((m) => ({
        userId: m.id,
        companyId: ap.companyId,
        title: pending ? 'Menunggu persetujuan Anda' : 'Bukti pelaksanaan diminta',
        message: pending
          ? `${ap.pic.name} mengajukan "${ap.title}" untuk disetujui.`
          : `"${ap.title}" milik ${ap.pic.name} menunggu bukti pelaksanaan.`,
        link,
      })),
    })
    created += managers.length
  }

  console.log(`Notifikasi persetujuan: ${created} baris baru (dari ${aps.length} AP)`)
}

async function main() {
  await upsertSuperAdmin()
  await seedDemoCompanies()
  await seedApprovalNotifications()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })