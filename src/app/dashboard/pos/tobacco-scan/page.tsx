'use client'
import { redirect } from 'next/navigation'

// Canonical location: /dashboard/owner/tobacco-scan
export default function TobaccoScanPOSRedirect() {
    redirect('/dashboard/owner/tobacco-scan')
}
