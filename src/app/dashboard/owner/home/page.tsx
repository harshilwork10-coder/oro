/**
 * /dashboard/owner/home → redirect to main dashboard
 * The main /dashboard page handles all role-based routing.
 */
import { redirect } from 'next/navigation'

export default function OwnerHomeRedirect() {
    redirect('/dashboard')
}
