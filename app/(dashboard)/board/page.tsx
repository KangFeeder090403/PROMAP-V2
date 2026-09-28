import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { KanbanClient } from '@/components/kanban/KanbanClient'

export default async function KanbanPage(
  props: {
    searchParams: Promise<{ projectId?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <KanbanClient
      role={user.role}
      userId={user.id}
      divisionId={user.divisionId}
      projectId={searchParams.projectId ?? ''}
    />
  )
}
