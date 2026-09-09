import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role === 'PIC' || user.role === 'GUEST') redirect('/')

  return <SettingsClient role={user.role} companyId={user.companyId} />
}
