import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { ProposalsClient } from '@/components/proposals/ProposalsClient'

export default async function ProposalsPage(
  props: {
    searchParams: Promise<{ new?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Semua role non-GUEST boleh create proposal (app/api/proposals/route.ts).
  return (
    <ProposalsClient
      role={user.role}
      userId={user.id}
      currentUserDivisionId={user.divisionId}
      openCreate={searchParams.new === '1'}
    />
  )
}
