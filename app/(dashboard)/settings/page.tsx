import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage(
  props: {
    searchParams?: Promise<{ tab?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role === 'PIC' || user.role === 'GUEST') redirect('/')

  return (
    <SettingsClient
      role={user.role}
      companyId={user.companyId}
      sessionUserId={user.id}
      initialTab={searchParams?.tab}
    />
  )
}
