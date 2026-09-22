import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { AuditLogClient } from '@/components/audit-logs/AuditLogClient'

export const metadata = {
  title: 'Catatan Audit Log & Tata Kelola | ProMaP',
  description:
    'Rekam jejak immutable seluruh mutasi entitas, kepatuhan multi-tenant, serah terima PIC, unggahan berkas bukti, dan otorisasi kepatuhan enterprise.',
}

export default async function AuditLogPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Hanya Super Admin, Admin Ops, dan Manager yang memiliki akses ke modul Audit Trail & Tata Kelola
  if (user.role === 'GUEST') redirect('/')

  return <AuditLogClient />
}
