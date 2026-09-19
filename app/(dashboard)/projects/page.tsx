import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { ProjectsClient } from '@/components/projects/ProjectsClient'

// Cermin canManageProject — PIC tidak bisa bikin project.
const CAN_CREATE = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER']

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { new?: string; open?: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <ProjectsClient
      role={user.role}
      currentUserDivisionId={user.divisionId}
      openCreate={CAN_CREATE.includes(user.role) && searchParams.new === '1'}
      initialOpenId={searchParams.open}
    />
  )
}
