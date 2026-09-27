import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { getProjectsData } from '@/lib/queries/projects-query'
import { ProjectsClient } from '@/components/projects/ProjectsClient'

// Cermin canManageProject — PIC tidak bisa bikin project.
const CAN_CREATE = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER']

export default async function ProjectsPage(
  props: {
    searchParams: Promise<{ new?: string; open?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const initialProjects = await getProjectsData(user)

  return (
    <ProjectsClient
      role={user.role}
      currentUserDivisionId={user.divisionId}
      openCreate={CAN_CREATE.includes(user.role) && searchParams.new === '1'}
      initialOpenId={searchParams.open}
      initialData={initialProjects}
    />
  )
}
