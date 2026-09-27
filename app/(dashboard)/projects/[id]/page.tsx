import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { ProjectDetailClient } from '@/components/projects/ProjectDetailClient'

export default async function ProjectDetailPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <ProjectDetailClient
      projectId={params.id}
      currentUserRole={user.role}
      currentUserId={user.id}
      currentUserDivisionId={user.divisionId ?? null}
    />
  )
}
