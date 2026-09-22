import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { LeadsManagementClient } from '@/components/leads/LeadsManagementClient'

export const metadata = {
  title: 'Manajemen Leads & Uji Coba — ProMaP',
  description: 'Pantau konversi calon klien B2B, status uji coba 30 hari, dan aktivitas login calon tenant.',
}

export default async function SettingsLeadsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'SUPER_ADMIN') redirect('/settings')

  return <LeadsManagementClient />
}
