'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect to the canonical customer retention report.
 * This page existed as a duplicate of /dashboard/reports/customer/retention.
 */
export default function RetentionRedirectPage() {
    const router = useRouter()
    useEffect(() => { router.replace('/dashboard/reports/customer/retention') }, [router])
    return (
        <div className="flex items-center justify-center min-h-screen bg-stone-950 text-stone-400">
            Redirecting to Customer Retention report...
        </div>
    )
}
