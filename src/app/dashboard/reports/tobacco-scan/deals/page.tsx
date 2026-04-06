'use client'
import { redirect } from 'next/navigation'

// Canonical location: /dashboard/owner/tobacco-scan/deals
export default function TobaccoDealsRedirect() {
    redirect('/dashboard/owner/tobacco-scan/deals')
}
