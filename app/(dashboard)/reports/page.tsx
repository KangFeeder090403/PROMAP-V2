import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSessionUser } from '@/lib/rbac'
import ReportsClient from '@/components/reports/ReportsClient'

export const metadata: Metadata = {
  title: 'Laporan Kinerja — ProMaP',
  description:
    'Ringkasan penyelesaian action plan, kecepatan pengerjaan, dan kelengkapan bukti kerja per periode.',
}

// Laporan hanya untuk Manager ke atas
const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER']

export default async function ReportsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!ALLOWED_ROLES.includes(user.role)) redirect('/')

  return <ReportsClient role={user.role} />
}
