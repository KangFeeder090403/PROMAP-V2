import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Hanya field aman yang dikirim ke client — jangan pernah teruskan
  // full row Prisma (ada password hash dsb).
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }

  return <DashboardShell user={safeUser}>{children}</DashboardShell>
}
