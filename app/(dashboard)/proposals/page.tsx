import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { ProposalsClient } from '@/components/proposals/ProposalsClient'

export default async function ProposalsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return <ProposalsClient role={user.role} userId={user.id} />
}
