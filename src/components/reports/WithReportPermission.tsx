'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { Role } from '@/lib/permissions'

export type ReportType = 'financial' | 'operational' | 'z-report' | 'benchmarking' | 'compliance'

interface RolePermissions {
    [key: string]: Role[]
}

// Define which roles can access which report types
const REPORT_PERMISSIONS: RolePermissions = {
    financial: [Role.PROVIDER, Role.FRANCHISOR, Role.FRANCHISEE],
    operational: [Role.PROVIDER, Role.FRANCHISOR, Role.FRANCHISEE, Role.MANAGER],
    'z-report': [Role.PROVIDER, Role.FRANCHISEE, Role.MANAGER, Role.EMPLOYEE, Role.USER],
    benchmarking: [Role.PROVIDER, Role.FRANCHISOR],
    compliance: [Role.PROVIDER, Role.FRANCHISOR, Role.FRANCHISEE]
}

interface WithReportPermissionProps {
    children: ReactNode
    reportType: ReportType
    fallbackUrl?: string
}

/**
 * Component wrapper that checks if the current user has permission to view a specific report type
 */
export function WithReportPermission({
    children,
    reportType,
    fallbackUrl = '/dashboard'
}: WithReportPermissionProps) {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        }
    })

    // Show loading state while checking auth
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    const userRole = session?.user?.role as Role

    // Check if user has permission for this report type
    const allowedRoles = REPORT_PERMISSIONS[reportType] || []
    const hasPermission = allowedRoles.includes(userRole) ||
        // Legacy USER role treated as EMPLOYEE
        (userRole === 'USER' && allowedRoles.includes(Role.EMPLOYEE))

    if (!hasPermission) {
        // User doesn't have permission - redirect to fallback
        redirect(fallbackUrl)
    }

    return <>{children}</>
}

/**
 * Higher-order component that wraps a report page with permission checking
 * Usage: export default withReportPermission(MyReportPage, 'financial')
 */
export function withReportPermission<P extends object>(
    Component: React.ComponentType<P>,
    reportType: ReportType,
    fallbackUrl?: string
) {
    return function ProtectedReport(props: P) {
        return (
            <WithReportPermission reportType={reportType} fallbackUrl={fallbackUrl}>
                <Component {...props} />
            </WithReportPermission>
        )
    }
}

