import { redirect } from 'next/navigation'

export default function OwnerHomeRedirect() {
    redirect('/dashboard')
}
