import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { ProjectsClient } from '@/components/projects/ProjectsClient'

export default async function ProjectsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return <ProjectsClient role={user.role} />
}
