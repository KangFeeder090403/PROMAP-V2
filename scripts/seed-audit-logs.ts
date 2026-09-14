import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function seedAuditLogs() {
  console.log('Seeding audit logs matching reference screenshot...')

  // Find demo company and users
  const company = await prisma.company.findFirst({
    where: { uniqueCode: 'DEMO001' },
    include: { users: true, divisions: true },
  })

  if (!company) {
    console.error('Company DEMO001 not found. Run db:seed first.')
    return
  }

  // Find or create required users with exact roles/labels
  let budi = await prisma.user.findFirst({ where: { email: 'budi@promapdemo.com' } })
  if (!budi) {
    budi = company.users[0]
  }

  let dewi = await prisma.user.findFirst({ where: { email: 'dewi@promapdemo.com' } })
  if (!dewi) {
    dewi = await prisma.user.create({
      data: {
        email: 'dewi@promapdemo.com',
        name: 'Dewi Sartika',
        role: 'MANAGER',
        status: 'ACTIVE',
        companyId: company.id,
        divisionId: company.divisions[0]?.id,
      },
    })
  }

  let ratna = await prisma.user.findFirst({ where: { email: 'ratna@promapdemo.com' } })
  if (!ratna) {
    ratna = await prisma.user.create({
      data: {
        email: 'ratna@promapdemo.com',
        name: 'Ratna Kusuma',
        role: 'ADMIN_OPERATIONAL',
        status: 'ACTIVE',
        companyId: company.id,
      },
    })
  }

  let ahmad = await prisma.user.findFirst({ where: { email: 'ahmad@promapdemo.com' } })
  if (!ahmad) {
    ahmad = await prisma.user.create({
      data: {
        email: 'ahmad@promapdemo.com',
        name: 'Ahmad R.',
        role: 'PIC',
        status: 'ACTIVE',
        companyId: company.id,
        divisionId: company.divisions[0]?.id,
      },
    })
  }

  let sistemUser = await prisma.user.findFirst({ where: { email: 'daemon@system.promap.internal' } })
  if (!sistemUser) {
    sistemUser = await prisma.user.create({
      data: {
        email: 'daemon@system.promap.internal',
        name: 'Sistem Otomasi ProMaP',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        companyId: company.id,
      },
    })
  }

  // Find or create Action Plans
  let ap104 = await prisma.actionPlan.findFirst({ where: { title: { contains: 'Action Plan #AP-104' } } })
  if (!ap104) {
    ap104 = await prisma.actionPlan.create({
      data: {
        title: 'Action Plan #AP-104 Pengetesan Beban Q3',
        outcomeKpi: 'Load testing 50,000 req/s stabil dengan latensi < 100ms',
        status: 'PENDING_APPROVAL',
        priority: 'HIGH',
        startDate: new Date('2026-09-01T08:00:00Z'),
        endDate: new Date('2026-09-30T17:00:00Z'),
        picId: budi.id,
        companyId: company.id,
        divisionId: company.divisions[0]?.id,
      },
    })
  }

  let ap98 = await prisma.actionPlan.findFirst({ where: { title: { contains: 'Action Plan #AP-98' } } })
  if (!ap98) {
    ap98 = await prisma.actionPlan.create({
      data: {
        title: 'Action Plan #AP-98 Kepatuhan Tata Kelola Kuartalan',
        outcomeKpi: 'Selesai 100% audit kepatuhan internal',
        status: 'APPROVED',
        priority: 'MEDIUM',
        startDate: new Date('2026-08-15T08:00:00Z'),
        endDate: new Date('2026-09-15T17:00:00Z'),
        picId: ahmad.id,
        companyId: company.id,
        divisionId: company.divisions[0]?.id,
      },
    })
  }

  let ap101 = await prisma.actionPlan.findFirst({ where: { title: { contains: 'Action Plan #AP-101' } } })
  if (!ap101) {
    ap101 = await prisma.actionPlan.create({
      data: {
        title: 'Action Plan #AP-101 Audit Kepatuhan PCI-DSS',
        outcomeKpi: 'Sertifikasi PCI-DSS Level 1 terpenuhi tanpa temuan mayor',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        startDate: new Date('2026-09-01T08:00:00Z'),
        endDate: new Date('2026-10-15T17:00:00Z'),
        picId: budi.id,
        companyId: company.id,
        divisionId: company.divisions[0]?.id,
      },
    })
  }

  let ap84 = await prisma.actionPlan.findFirst({ where: { title: { contains: 'Action Plan #AP-84' } } })
  if (!ap84) {
    ap84 = await prisma.actionPlan.create({
      data: {
        title: 'Action Plan #AP-84 Pembaruan Arsitektur Gateway SLA',
        outcomeKpi: 'Gateway teruji 99.99% uptime',
        status: 'OVERDUE',
        priority: 'HIGH',
        startDate: new Date('2026-08-01T08:00:00Z'),
        endDate: new Date('2026-09-02T12:00:00Z'),
        picId: ahmad.id,
        companyId: company.id,
        divisionId: company.divisions[0]?.id,
      },
    })
  }

  // Clear existing mock logs to avoid duplication if rerun
  await prisma.activityLog.deleteMany({
    where: {
      userId: { in: [budi.id, dewi.id, ratna.id, ahmad.id, sistemUser.id] },
      actionPlanId: { in: [ap104.id, ap98.id, ap101.id, ap84.id] },
    },
  })

  // Date generators (reference: 04 Sept 2026, 03 Sept 2026, 02 Sept 2026)
  const dToday1 = new Date('2026-09-04T07:28:00Z') // 14:28 WIB
  const dToday2 = new Date('2026-09-04T04:05:00Z') // 11:05 WIB
  const dToday3 = new Date('2026-09-04T02:41:00Z') // 09:41 WIB
  const dYest1 = new Date('2026-09-03T09:15:00Z')  // 16:15 WIB
  const dYest2 = new Date('2026-09-03T03:12:00Z')  // 10:12 WIB
  const dArch1 = new Date('2026-09-02T16:59:00Z')  // 23:59 WIB

  // Log 1: Budi Santoso - Status update with full diff viewer
  await prisma.activityLog.create({
    data: {
      userId: budi.id,
      actionPlanId: ap104.id,
      action: 'STATUS_CHANGED',
      oldValue: JSON.stringify({
        revision: 'Revisi #03',
        status: 'IN_PROGRESS',
        pic_assignee: 'Ahmad R. (ID: USR-092)',
        risk_scoring: 'MODERATE_LVL2',
        title: 'Action Plan #AP-104',
      }),
      newValue: JSON.stringify({
        revision: 'Revisi #04 (Terkini)',
        status: 'PENDING_APPROVAL',
        pic_assignee: 'Ahmad R. (ID: USR-092)',
        risk_scoring: 'MODERATE_LVL2',
        title: 'Action Plan #AP-104',
        tx_uuid: '89d2a104-e740-4b61',
        author_note:
          'Seluruh berkas bukti pengetesan beban (load testing) Q3 telah lengkap. Pengajuan dialihkan ke Manager untuk telaah akhir sebelum implementasi deployment.',
      }),
      createdAt: dToday1,
    },
  })

  // Log 2: Budi Santoso - Evidence Upload with SHA-256
  await prisma.activityLog.create({
    data: {
      userId: budi.id,
      actionPlanId: ap104.id,
      action: 'EVIDENCE_SUBMITTED',
      oldValue: null,
      newValue: JSON.stringify({
        file_name: 'evidence_load_testing_q3_signoff.pdf',
        file_size: '4.8 MB',
        file_url: 'https://storage.promap.internal/evidence/ap-104/load-test-report.pdf',
        sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        verification_status: 'VERIFIED_ENCRYPTED',
        task_name: 'Task Migrasi DB Cloud Multi-Region',
      }),
      createdAt: dToday2,
    },
  })

  // Log 3: Dewi Sartika - Manager Approval
  await prisma.activityLog.create({
    data: {
      userId: dewi.id,
      actionPlanId: ap98.id,
      action: 'APPROVAL',
      oldValue: 'PENDING_APPROVAL',
      newValue: JSON.stringify({
        status: 'APPROVED',
        review_note:
          'Menyetujui pengajuan Action Plan #AP-98 dengan catatan evaluasi kuartalan sesuai rekomendasi komite tata kelola.',
        approver_role: 'Manager • Corporate Governance',
        approval_tier: 'TIER_1_DIVISIONAL',
      }),
      createdAt: dToday3,
    },
  })

  // Log 4: Ratna Kusuma - Reassign PIC
  await prisma.activityLog.create({
    data: {
      userId: ratna.id,
      actionPlanId: ap101.id,
      action: 'REASSIGNED',
      oldValue: JSON.stringify({
        previous_pic: 'Ratna Kusuma',
        pic_id: ratna.id,
        role: 'VP Risk & Compliance',
      }),
      newValue: JSON.stringify({
        new_pic: 'Budi Santoso',
        pic_id: budi.id,
        role: 'Lead Operational Risk',
        action_plan_name: 'Action Plan #AP-101 Audit Kepatuhan PCI-DSS',
        reason:
          'Pengalihan wewenang eksekusi audit PCI-DSS tingkat teknis operasional ke lead operational risk.',
      }),
      createdAt: dYest1,
    },
  })

  // Log 5: Ahmad R. - Create Sub-Task
  await prisma.activityLog.create({
    data: {
      userId: ahmad.id,
      actionPlanId: ap101.id,
      action: 'TASK_CREATED',
      oldValue: null,
      newValue: JSON.stringify({
        task_code: 'Task #TSK-208',
        task_title: 'Task #TSK-208 Vulnerability Scanning Gateway',
        parent_initiative: 'Inisiatif Keamanan Core',
        priority: 'HIGH',
        scope: 'Gateway Ingress/Egress IP whitelist scanning & penetration testing',
      }),
      createdAt: dYest2,
    },
  })

  // Log 6: Sistem Otomasi ProMaP - Auto Escalation Cron
  await prisma.activityLog.create({
    data: {
      userId: sistemUser.id,
      actionPlanId: ap84.id,
      action: 'AUTO_ESCALATION',
      oldValue: 'IN_PROGRESS',
      newValue: JSON.stringify({
        status: 'OVERDUE_ESCALATED',
        trigger_engine: 'Daemon • Cron SLA Engine',
        reason: 'Masa tenggat pengerjaan terlewati lebih dari 24 jam tanpa laporan progress.',
        action_plan_name: 'Action Plan #AP-84',
        sla_deadline: '2026-09-02 12:00 WIB',
        escalation_target: 'Manager Divisi & Kadiv Tata Kelola',
      }),
      createdAt: dArch1,
    },
  })

  console.log('Audit logs seed completed successfully!')
}

seedAuditLogs()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
