import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSessionUser } from '@/lib/rbac'
import ReportsClient from '@/components/reports/ReportsClient'

export const metadata: Metadata = {
  title: 'Executive Reports & Performance Analytics — ProMaP',
  description:
    'Executive Intelligence & Oversight Console. Laporan komprehensif realisasi Action Plan, evaluasi kecepatan eksekusi, audit kepatuhan bukti kerja, serta export data formal eksekutif.',
}

// PRD §C1 #16, §B5 — Hanya peran senior yang dapat mengakses executive reports
const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER']

export default async function ReportsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!ALLOWED_ROLES.includes(user.role)) redirect('/')

  return <ReportsClient />
}
