/**
 * Seed AP historis Mei–Agustus 2026 untuk mengisi tab "Semua" di dashboard.
 *
 * Terpisah dari prisma/seed.ts karena seedDemoCompanies() early-return kalau
 * DEMO001 sudah ada — data historis tak akan pernah tercipta lewat jalur itu.
 *
 * Idempoten: guard by (title + companyId). Jalankan berapa kali pun aman.
 *   npx tsx scripts/seed-historical-ap.ts
 */
import { prisma } from '@/lib/prisma'
import type { ActionPlanStatus, Priority } from '@/lib/generated/prisma/client'

type Row = {
  picEmail: string
  title: string
  kpi: string
  status: ActionPlanStatus
  priority: Priority
  start: string
  end: string
  evidence?: string
}

/** Semua di masa lampau (hari ini 2026-09-09) — status akhir COMPLETE/OVERDUE. */
const ROWS: Row[] = [
  { picEmail: 'rian@promapdemo.com', title: 'Kampanye Peluncuran Produk Q2', kpi: '10.000 leads baru', status: 'COMPLETE', priority: 'HIGH', start: '2026-05-02', end: '2026-05-28' },
  { picEmail: 'dinda@promapdemo.com', title: 'Optimasi Funnel Konversi Landing Page', kpi: 'Conversion rate +3%', status: 'COMPLETE', priority: 'MEDIUM', start: '2026-05-10', end: '2026-06-05' },
  { picEmail: 'nadia@promapdemo.com', title: 'Riset Pasar Segmen UMKM', kpi: 'Laporan 3 persona', status: 'OVERDUE', priority: 'MEDIUM', start: '2026-06-01', end: '2026-06-24' },
  { picEmail: 'andi@promapdemo.com', title: 'Kemitraan Konten dengan 5 Kreator', kpi: '5 MoU ditandatangani', status: 'COMPLETE', priority: 'LOW', start: '2026-06-15', end: '2026-07-10' },
  { picEmail: 'rian@promapdemo.com', title: 'Program Loyalitas Pelanggan Fase 1', kpi: 'Retensi +5%', status: 'COMPLETE', priority: 'HIGH', start: '2026-07-01', end: '2026-07-29' },
  { picEmail: 'dinda@promapdemo.com', title: 'Audit SEO Teknis Situs Utama', kpi: 'Skor Lighthouse > 90', status: 'OVERDUE', priority: 'HIGH', start: '2026-08-03', end: '2026-08-27' },
  { picEmail: 'nadia@promapdemo.com', title: 'Rebranding Aset Media Sosial', kpi: 'Semua kanal seragam', status: 'COMPLETE', priority: 'LOW', start: '2026-08-05', end: '2026-08-25' },
]

async function main() {
  let created = 0
  let skipped = 0

  for (const r of ROWS) {
    const pic = await prisma.user.findUnique({
      where: { email: r.picEmail },
      select: { id: true, companyId: true, divisionId: true },
    })
    if (!pic || !pic.companyId) {
      console.warn(`  ! PIC ${r.picEmail} tidak ada / tanpa company — seed demo utama belum dijalankan? Lewati.`)
      continue
    }
    const companyId = pic.companyId

    // Guard idempoten: ActionPlan.title tidak unique, cek per company.
    const existing = await prisma.actionPlan.findFirst({
      where: { title: r.title, companyId, deletedAt: null },
      select: { id: true },
    })
    if (existing) {
      skipped += 1
      continue
    }

    await prisma.actionPlan.create({
      data: {
        title: r.title,
        outcomeKpi: r.kpi,
        status: r.status,
        priority: r.priority,
        picId: pic.id,
        companyId,
        divisionId: pic.divisionId,
        startDate: new Date(`${r.start}T09:00:00`),
        endDate: new Date(`${r.end}T17:00:00`),
        evidenceLink: r.evidence ?? null,
      },
    })
    created += 1
  }

  console.log(`Selesai — ${created} AP historis dibuat, ${skipped} sudah ada (dilewati).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
