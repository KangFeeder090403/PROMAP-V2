import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/rbac'
import { getCalendarInitialData } from '@/lib/queries/calendar-query-cached'
import { CalendarClient } from '@/components/calendar/CalendarClient'

export default async function CalendarPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { filterOptions, events } = await getCalendarInitialData(user)

  return (
    <CalendarClient
      initialEvents={events}
      initialFilterOptions={filterOptions}
    />
  )
}
