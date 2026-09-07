import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { ProposalsClient } from '@/components/proposals/ProposalsClient'

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: { new?: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Semua role non-GUEST boleh create proposal (app/api/proposals/route.ts).
  return <ProposalsClient role={user.role} userId={user.id} openCreate={searchParams.new === '1'} />
}
