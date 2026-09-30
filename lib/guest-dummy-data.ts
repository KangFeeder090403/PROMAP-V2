import type { ActionPlanStatus, Priority, ProposalStatus } from '@/lib/generated/prisma/client'
import type { APRow, ProposalRow } from '@/lib/dashboard-aggregate'
import type { PortfolioProject, PortfolioTask } from '@/lib/dashboard-portfolio'

export function getGuestDummyData(now = new Date()) {
  const dayMs = 86_400_000

  const daysAgo = (n: number) => new Date(now.getTime() - n * dayMs)
  const daysFromNow = (n: number) => new Date(now.getTime() + n * dayMs)

  const actionPlans: (APRow & {
    id: string
    title: string
    status: ActionPlanStatus
    priority: Priority
    picId: string
    pic: { name: string }
    outcomeKpi: string
    evidenceLink: string | null
    endDate: Date
    createdAt: Date
  })[] = [
    {
      id: 'clxdemoap01',
      title: 'Migrasi Infrastruktur Cloud AWS ke Hybrid Multi-Region',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      picId: 'guest-hendra-wijaya',
      pic: { name: 'Hendra Wijaya' },
      outcomeKpi: 'Uptime 99.95% & Latency p95 < 120ms',
      evidenceLink: 'https://github.com/promap-demo/infra',
      endDate: daysFromNow(5),
      createdAt: daysAgo(10),
    },
    {
      id: 'clxdemoap02',
      title: 'Audit Kepatuhan ISO 27001 Sistem IT Operasional',
      status: 'PENDING_APPROVAL',
      priority: 'HIGH',
      picId: 'guest-hendra-wijaya',
      pic: { name: 'Hendra Wijaya' },
      outcomeKpi: 'Lolos audit tanpa temuan kategori mayor',
      evidenceLink: 'https://docs.promap.id/audit-iso.pdf',
      endDate: daysFromNow(2),
      createdAt: daysAgo(14),
    },
    {
      id: 'clxdemoap03',
      title: 'Implementasi Disaster Recovery Plan & Otomasi Failover',
      status: 'EVIDENCE_REQUIRED',
      priority: 'HIGH',
      picId: 'guest-hendra-wijaya',
      pic: { name: 'Hendra Wijaya' },
      outcomeKpi: 'RTO < 2 jam, RPO < 15 menit',
      evidenceLink: null,
      endDate: daysFromNow(1),
      createdAt: daysAgo(7),
    },
    {
      id: 'clxdemoap04',
      title: 'Otomasi Pipeline Deployment CI/CD Microservices',
      status: 'APPROVED',
      priority: 'MEDIUM',
      picId: 'guest-hendra-wijaya',
      pic: { name: 'Hendra Wijaya' },
      outcomeKpi: 'Frekuensi deploy meningkat menjadi 5x/minggu',
      evidenceLink: 'https://ci.promap.id/build/492',
      endDate: daysAgo(1),
      createdAt: daysAgo(20),
    },
    {
      id: 'clxdemoap05',
      title: 'Review Arsitektur Database & Scaling IOPS Neon',
      status: 'COMPLETE',
      priority: 'MEDIUM',
      picId: 'guest-hendra-wijaya',
      pic: { name: 'Hendra Wijaya' },
      outcomeKpi: 'Query response time p95 turun dari 240ms ke 45ms',
      evidenceLink: 'https://stats.promap.id/db-report',
      endDate: daysAgo(3),
      createdAt: daysAgo(25),
    },
    {
      id: 'clxdemoap06',
      title: 'Pembaruan Lisensi & Monitoring Kapasitas Storage Q3',
      status: 'OVERDUE',
      priority: 'LOW',
      picId: 'guest-hendra-wijaya',
      pic: { name: 'Hendra Wijaya' },
      outcomeKpi: 'Kapasitas storage terpantau di bawah 75%',
      evidenceLink: null,
      endDate: daysAgo(2),
      createdAt: daysAgo(18),
    },
    {
      id: 'clxdemoap07',
      title: 'Pelatihan Keamanan Cyber Karyawan Batch 2',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      picId: 'guest-hendra-wijaya',
      pic: { name: 'Hendra Wijaya' },
      outcomeKpi: '100% karyawan menyelesaikan simulasi phishing',
      evidenceLink: null,
      endDate: daysFromNow(7),
      createdAt: daysAgo(4),
    },
    {
      id: 'clxdemoap08',
      title: 'Integrasi Single Sign-On (SSO) & Multi-Factor Auth',
      status: 'APPROVED',
      priority: 'HIGH',
      picId: 'guest-hendra-wijaya',
      pic: { name: 'Hendra Wijaya' },
      outcomeKpi: 'Zero unauthorized access report tercatat di SIEM',
      evidenceLink: 'https://auth.promap.id/logs',
      endDate: daysFromNow(4),
      createdAt: daysAgo(12),
    },
  ]

  const proposals: (ProposalRow & {
    proposer: { name: string }
  })[] = [
    {
      id: 'clxdemopr01',
      title: 'Pengadaan Dedicated Cloud Firewall & DDoS Protection',
      description: 'Penambahan perlindungan Cloudflare Enterprise untuk mitigasi serangan trafik abnormal.',
      status: 'SUBMITTED' as ProposalStatus,
      proposerName: 'Hendra Wijaya',
      proposer: { name: 'Hendra Wijaya' },
      createdAt: daysAgo(3),
    },
    {
      id: 'clxdemopr02',
      title: 'Upgrade Tooling APM Datadog untuk Production Staging',
      description: 'Monitoring performa trace request dan error rate secara real-time pada microservices.',
      status: 'SUBMITTED' as ProposalStatus,
      proposerName: 'Hendra Wijaya',
      proposer: { name: 'Hendra Wijaya' },
      createdAt: daysAgo(6),
    },
  ]

  const portfolioProjects: PortfolioProject[] = [
    {
      id: 'proj-demo-1',
      name: 'Transformasi Digital Operasional 2026',
      startDate: daysAgo(30),
      endDate: daysFromNow(60),
      createdAt: daysAgo(30),
      divisionId: 'demo-division-id',
    },
    {
      id: 'proj-demo-2',
      name: 'Modernisasi Infrastruktur & DevOps',
      startDate: daysAgo(20),
      endDate: daysFromNow(40),
      createdAt: daysAgo(20),
      divisionId: 'demo-division-id',
    },
  ]

  const portfolioTasks: PortfolioTask[] = [
    {
      projectId: 'proj-demo-1',
      divisionId: 'demo-division-id',
      title: 'Migrasi Cloud Infrastructure',
      status: 'IN_PROGRESS',
      endDate: daysFromNow(5),
      picName: 'Hendra Wijaya',
    },
    {
      projectId: 'proj-demo-1',
      divisionId: 'demo-division-id',
      title: 'Security & ISO Compliance Audit',
      status: 'PENDING_APPROVAL',
      endDate: daysFromNow(2),
      picName: 'Hendra Wijaya',
    },
    {
      projectId: 'proj-demo-2',
      divisionId: 'demo-division-id',
      title: 'Otomasi CI/CD Pipeline',
      status: 'COMPLETE',
      endDate: daysAgo(1),
      picName: 'Hendra Wijaya',
    },
    {
      projectId: 'proj-demo-2',
      divisionId: 'demo-division-id',
      title: 'Database Performance Tuning',
      status: 'COMPLETE',
      endDate: daysAgo(3),
      picName: 'Hendra Wijaya',
    },
  ]

  const divisionMap = new Map<string, string>([
    ['demo-division-id', 'IT Operasional'],
  ])

  return {
    actionPlans,
    proposals,
    portfolioProjects,
    portfolioTasks,
    divisionMap,
  }
}
