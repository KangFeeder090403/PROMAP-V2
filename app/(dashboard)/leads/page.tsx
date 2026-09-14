import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { LeadSection } from '@/components/settings/LeadSection'

export default async function LeadsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'SUPER_ADMIN') redirect('/settings')

  return (
    <div className="space-y-4">
      <nav className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
        <span>Workspace</span>
        <span>/</span>
        <span>Settings</span>
        <span>/</span>
        <span className="text-blue-500 font-medium">CRM Leads</span>
      </nav>
      <LeadSection />
    </div>
  )
}
