import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { CalendarClient } from '@/components/calendar/CalendarClient'

export default async function CalendarPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return <CalendarClient />
}
