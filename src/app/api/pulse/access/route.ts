import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Check if user has access to Oro 9 Pulse
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ hasAccess: false, reason: 'not_authenticated' })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                franchise: {
                    include: {
                        franchisor: {
                            include: {
                                config: true
                            }
                        }
                    }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ hasAccess: false, reason: 'user_not_found' })
        }

        // PROVIDER always has access (for support/demo purposes)
        if (user.role === 'PROVIDER') {
            return NextResponse.json({ hasAccess: true, reason: 'provider_access' })
        }

        // EMPLOYEES and MANAGERS get free access to Pulse (for their salon/retail app)
        if (user.role === 'EMPLOYEE' || user.role === 'MANAGER') {
            return NextResponse.json({
                hasAccess: true,
                reason: 'employee_access',
                message: 'Employee access to Oro Pulse'
            })
        }

        // SHIFT_SUPERVISOR, FRANCHISEE have limited access - subject to business decision
        const blockedRoles = ['SHIFT_SUPERVISOR', 'FRANCHISEE']
        if (blockedRoles.includes(user.role)) {
            return NextResponse.json({
                hasAccess: false,
                reason: 'role_not_allowed',
                message: 'Oro 9 Pulse is only available for business owners and staff.'
            })
        }

        // Only FRANCHISOR (store owners) can access Pulse with a valid license
        if (user.role !== 'FRANCHISOR' && user.role !== 'OWNER') {
            return NextResponse.json({
                hasAccess: false,
                reason: 'role_not_allowed',
                message: 'Oro 9 Pulse is only available for business owners.'
            })
        }

        // Try to get config from franchise relationship first
        let config = user.franchise?.franchisor?.config

        // If no config found, check if this user IS the franchisor owner directly
        if (!config) {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: session.user.id },
                include: { config: true }
            })
            config = franchisor?.config ?? null
        }

        if (!config) {
            return NextResponse.json({
                hasAccess: false,
                reason: 'no_config',
                message: 'Oro 9 Pulse is not configured for your business. Contact your administrator.'
            })
        }

        if (!config.usesMobilePulse) {
            return NextResponse.json({
                hasAccess: false,
                reason: 'not_enabled',
                message: 'Oro 9 Pulse is not enabled for your business. Contact your provider to add this feature.'
            })
        }

        // Franchisor owners automatically get Pulse access if enabled
        return NextResponse.json({
            hasAccess: true,
            reason: 'franchisor_owner',
            seatsAvailable: config.pulseSeatCount
        })

    } catch (error) {
        console.error('Error checking Pulse access:', error)
        return NextResponse.json({ hasAccess: false, reason: 'error' }, { status: 500 })
    }
}
