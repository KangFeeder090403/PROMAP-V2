import { redirect } from 'next/navigation'

export default function ActionPlanIdPage({ params }: { params: { id: string } }) {
  redirect(`/action-plans?open=${params.id}&highlight=${params.id}`)
}
