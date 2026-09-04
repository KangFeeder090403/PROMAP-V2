import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { ActionPlansClient } from '@/components/action-plans/ActionPlansClient'

export default async function ActionPlansPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return <ActionPlansClient role={user.role} userId={user.id} />
}
