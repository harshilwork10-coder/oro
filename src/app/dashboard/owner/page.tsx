import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

import SalonOwnerCommandCenter from '@/components/dashboard/SalonOwnerCommandCenter'
import RetailEnterpriseDashboard from '@/components/dashboard/RetailEnterpriseDashboard'

export default async function OwnerDashboardSwitch() {
    const session = await getServerSession(authOptions)

    // Ensure the user actually has the right role
    if (!session || (session.user.role !== 'OWNER' && session.user.role !== 'FRANCHISOR')) {
        redirect('/login')
    }

    // Direct to the correct dashboard based on industry
    const industry = session.user.industry || 'RETAIL'

    if (industry === 'SALON' || industry === 'SERVICE') {
        return <SalonOwnerCommandCenter />
    }

    // Default to retail legacy
    return <RetailEnterpriseDashboard />
}
