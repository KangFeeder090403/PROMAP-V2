import { redirect } from 'next/navigation'

export default function UserLabelsRedirect() {
  redirect('/settings?tab=userLabel')
}
