'use client'
import { redirect } from 'next/navigation'

// Canonical location: /dashboard/owner/tobacco-scan/settings
export default function TobaccoSettingsRedirect() {
    redirect('/dashboard/owner/tobacco-scan/settings')
}
