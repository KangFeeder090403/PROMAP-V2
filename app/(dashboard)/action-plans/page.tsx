import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { ActionPlansClient } from '@/components/action-plans/ActionPlansClient'

export default async function ActionPlansPage({
  searchParams,
}: {
  searchParams: { new?: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Semua role non-GUEST boleh create AP (lib/rbac.ts canCreateAP);
  // getSessionUser sudah menolak guest → tidak perlu gating tambahan.
  return (
    <ActionPlansClient role={user.role} userId={user.id} openCreate={searchParams.new === '1'} />
  )
}
