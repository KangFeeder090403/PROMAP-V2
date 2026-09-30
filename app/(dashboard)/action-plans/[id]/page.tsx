import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { ActionPlanWorkspaceClient } from '@/components/action-plans/ActionPlanWorkspaceClient'

export default async function ActionPlanIdPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <ActionPlanWorkspaceClient
      actionPlanId={params.id}
      currentUser={{
        id: user.id,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        divisionId: user.divisionId,
      }}
    />
  )
}
