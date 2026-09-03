import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN_OPERATIONAL') redirect('/')

  return <SettingsClient role={user.role} companyId={user.companyId} />
}
