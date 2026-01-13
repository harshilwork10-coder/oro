'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Role } from '@/lib/permissions'
import { ShieldAlert } from 'lucide-react'

interface RoleGuardProps {
    children: React.ReactNode
    allowedRoles: Role[]
    fallbackUrl?: string
}

/**
 * RoleGuard - Protects pages based on user role
 * 
 * Usage:
 * <RoleGuard allowedRoles={[Role.FRANCHISOR, Role.FRANCHISEE]}>
 *   <YourPageContent />
 * </RoleGuard>
 */
export default function RoleGuard({
    children,
    allowedRoles,
    fallbackUrl = '/dashboard'
}: RoleGuardProps) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const userRole = session?.user?.role as Role | undefined

    useEffect(() => {
        // If authentication is loading, wait
        if (status === 'loading') return

        // If not authenticated, redirect to login
        if (status === 'unauthenticated') {
            router.replace('/login')
            return
        }

        // If authenticated but role not allowed, redirect to dashboard
        if (userRole && !allowedRoles.includes(userRole)) {
            console.error(`[RoleGuard] Access denied for role ${userRole} - redirecting`)
            router.replace(fallbackUrl)
        }
    }, [status, userRole, allowedRoles, router, fallbackUrl])

    // Show loading state
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    // Not authenticated - will redirect
    if (status === 'unauthenticated') {
        return null
    }

    // Role not allowed - show brief message before redirect
    if (userRole && !allowedRoles.includes(userRole)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-stone-400 mb-4">
                    You don't have permission to access this page.
                </p>
                <p className="text-stone-500 text-sm">
                    Redirecting to dashboard...
                </p>
            </div>
        )
    }

    // Role is allowed - render children
    return <>{children}</>
}

/**
 * Hook to check if current user has a specific role
 */
export function useRoleCheck(allowedRoles: Role[]): {
    isAllowed: boolean
    isLoading: boolean
    userRole: Role | undefined
} {
    const { data: session, status } = useSession()
    const userRole = session?.user?.role as Role | undefined

    return {
        isAllowed: userRole ? allowedRoles.includes(userRole) : false,
        isLoading: status === 'loading',
        userRole
    }
}

