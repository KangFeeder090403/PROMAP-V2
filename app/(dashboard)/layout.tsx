import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { devGetImpersonationFlag } from '@/lib/dev-impersonate'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login?signout=1')

  // Dev-only: fitur switch akun testing. Flag dipakai widget untuk tombol
  // "Kembali ke akun asli". Nonaktif & selalu false di production.
  const isImpersonating = await devGetImpersonationFlag()

  // Hanya field aman yang dikirim ke client — jangan pernah teruskan
  // full row Prisma (ada password hash dsb).
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isImpersonating,
  }

  return <DashboardShell user={safeUser}>{children}</DashboardShell>
}
