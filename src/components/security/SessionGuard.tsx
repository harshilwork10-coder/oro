'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * SessionGuard - Client-side session validation component
 * Prevents browser back button access after logout
 * Checks session on every page load and navigation
 */
export default function SessionGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        // Prevent browser back button cache
        if (typeof window !== 'undefined') {
            window.history.pushState(null, '', window.location.href)

            const handlePopState = () => {
                window.history.pushState(null, '', window.location.href)
            }

            window.addEventListener('popstate', handlePopState)

            return () => {
                window.removeEventListener('popstate', handlePopState)
            }
        }
    }, [])

    useEffect(() => {
        // Force session revalidation on mount and visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Revalidate session when page becomes visible
                if (status === 'unauthenticated') {
                    router.push('/login')
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [status, router])

    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
        router.push('/login')
        return null
    }

    // Show loading state while checking session
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-stone-400">Verifying session...</div>
            </div>
        )
    }

    return <>{children}</>
}

