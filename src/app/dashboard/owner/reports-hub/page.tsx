'use client'
import { redirect } from 'next/navigation'

// Canonical location: /dashboard/reports
export default function ReportsHubRedirect() {
    redirect('/dashboard/reports')
}
