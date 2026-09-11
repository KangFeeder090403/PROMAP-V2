import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import { devGetImpersonationFlag } from '@/lib/dev-impersonate'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login?signout=1')
<<<<<<< HEAD
=======

  // Dev-only: fitur switch akun testing. Flag dipakai widget untuk tombol
  // "Kembali ke akun asli". Nonaktif & selalu false di production.
  const isImpersonating = await devGetImpersonationFlag()

  const [company, division] = await Promise.all([
    user.companyId
      ? prisma.company.findUnique({
          where: { id: user.companyId },
          select: { name: true },
        })
      : null,
    user.divisionId
      ? prisma.division.findUnique({
          where: { id: user.divisionId },
          select: { name: true },
        })
      : null,
  ])
>>>>>>> d56e9bf655fa6a5ea4d2756757baa8f9ef16cb02

  // Hanya field aman yang dikirim ke client — jangan pernah teruskan
  // full row Prisma (ada password hash dsb).
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    companyName: company?.name ?? null,
    divisionId: user.divisionId,
    divisionName: division?.name ?? null,
    isImpersonating,
  }

  return <DashboardShell user={safeUser}>{children}</DashboardShell>
}
