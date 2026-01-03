import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Check if user has access to Oronex Pulse
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

        // EMPLOYEES, MANAGERS, SHIFT_SUPERVISORS CANNOT access Pulse - it's for OWNERS only
        const blockedRoles = ['EMPLOYEE', 'MANAGER', 'SHIFT_SUPERVISOR', 'FRANCHISEE']
        if (blockedRoles.includes(user.role)) {
            return NextResponse.json({
                hasAccess: false,
                reason: 'role_not_allowed',
                message: 'Oronex Pulse is only available for business owners.'
            })
        }

        // Only FRANCHISOR (store owners) can access Pulse with a valid license
        if (user.role !== 'FRANCHISOR' && user.role !== 'OWNER') {
            return NextResponse.json({
                hasAccess: false,
                reason: 'role_not_allowed',
                message: 'Oronex Pulse is only available for business owners.'
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
                message: 'Oronex Pulse is not configured for your business. Contact your administrator.'
            })
        }

        if (!config.usesMobilePulse) {
            return NextResponse.json({
                hasAccess: false,
                reason: 'not_enabled',
                message: 'Oronex Pulse is not enabled for your business. Contact your provider to add this feature.'
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
