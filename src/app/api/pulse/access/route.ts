import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Check if user has access to Oro Pulse
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ hasAccess: false, reason: 'not_authenticated' })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                role: true,
                hasPulseAccess: true, // Per-user license
                franchiseId: true,
                franchise: {
                    select: {
                        franchisorId: true,
                        franchisor: {
                            select: {
                                config: {
                                    select: {
                                        usesMobilePulse: true,
                                        pulseSeatCount: true
                                    }
                                }
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

        // EMPLOYEES, MANAGERS, SHIFT_SUPERVISORS CANNOT access Pulse - it's for OWNERS only
        const blockedRoles = ['EMPLOYEE', 'MANAGER', 'SHIFT_SUPERVISOR', 'FRANCHISEE']
        if (blockedRoles.includes(user.role)) {
            return NextResponse.json({
                hasAccess: false,
                reason: 'role_not_allowed',
                message: 'Oro Pulse is only available for business owners.'
            })
        }

        // Only FRANCHISOR (store owners) can access Pulse with a valid license
        if (user.role !== 'FRANCHISOR' && user.role !== 'OWNER') {
            return NextResponse.json({
                hasAccess: false,
                reason: 'role_not_allowed',
                message: 'Oro Pulse is only available for business owners.'
            })
        }

        // Check if this specific user has a Pulse license
        if (user.hasPulseAccess) {
            return NextResponse.json({ hasAccess: true, reason: 'user_licensed' })
        }

        // Check if franchisor has Pulse enabled (for backwards compatibility)
        const config = user.franchise?.franchisor?.config
        if (!config) {
            return NextResponse.json({
                hasAccess: false,
                reason: 'no_config',
                message: 'Oro Pulse is not configured for your business. Contact your administrator.'
            })
        }

        if (!config.usesMobilePulse) {
            return NextResponse.json({
                hasAccess: false,
                reason: 'not_enabled',
                message: 'Oro Pulse is not enabled for your business. Contact your provider to add this feature.'
            })
        }

        // Pulse is enabled for business but this user doesn't have a seat
        return NextResponse.json({
            hasAccess: false,
            reason: 'no_seat_assigned',
            message: 'You do not have an Oro Pulse license. Ask your administrator to assign you a seat.',
            seatsAvailable: config.pulseSeatCount
        })

    } catch (error) {
        console.error('Error checking Pulse access:', error)
        return NextResponse.json({ hasAccess: false, reason: 'error' }, { status: 500 })
    }
}
