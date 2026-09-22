import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'

export default async function LeadsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Hanya SUPER_ADMIN yang memiliki akses ke CRM Leads
  if (user.role !== 'SUPER_ADMIN') {
    redirect('/settings')
  }

  // Konsolidasi: alihkan rute mandiri /leads ke tab CRM Leads di Settings
  redirect('/settings?tab=leads')
}
