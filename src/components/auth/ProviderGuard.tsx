'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Provider-only page guard component.
 * 
 * Usage: Add at the top of any provider-only settings page:
 *   <ProviderGuard />
 * 
 * Redirects non-PROVIDER/ADMIN users to /dashboard/settings.
 * Returns null (renders nothing) — purely a side-effect component.
 */
export function ProviderGuard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const user = session?.user as any

    useEffect(() => {
        if (status === 'loading') return
        if (!user || !['PROVIDER', 'ADMIN'].includes(user.role)) {
            router.replace('/dashboard/settings')
        }
    }, [status, user, router])

    return null
}
