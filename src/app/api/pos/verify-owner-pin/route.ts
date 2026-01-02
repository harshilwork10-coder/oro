import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkRateLimit, getClientIP, PIN_RATE_LIMIT } from '@/lib/security/rateLimit'

/**
 * POST /api/pos/verify-owner-pin
 * 
 * Verifies PIN to exit kiosk mode
 * Allowed roles: OWNER, FRANCHISOR, MANAGER, PROVIDER (support team)
 * SECURITY: Rate limited to prevent brute force
 */
export async function POST(request: NextRequest) {
    try {
        // SECURITY: Rate limiting to prevent PIN brute force
        const clientIP = getClientIP(request)
        const rateLimit = checkRateLimit(`pin:${clientIP}`, PIN_RATE_LIMIT)

        if (!rateLimit.allowed) {
            console.warn(`[SECURITY] PIN rate limit exceeded for IP: ${clientIP}`)
            return NextResponse.json({
                success: false,
                error: `Too many attempts. Try again after ${rateLimit.resetAt.toLocaleTimeString()}`
            }, { status: 429 })
        }

        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
        }

        const { pin } = await request.json()

        if (!pin || pin.length < 4) {
            return NextResponse.json({ success: false, error: 'PIN required (min 4 digits)' }, { status: 400 })
        }

        // Get current user's franchise/location context
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true, locationId: true }
        })

        if (!currentUser?.franchiseId) {
            return NextResponse.json({ success: false, error: 'No franchise context' }, { status: 400 })
        }

        // Find authorized users who can exit kiosk mode:
        // 1. PROVIDER (support team) - can exit any kiosk
        // 2. OWNER/FRANCHISOR - can exit their own stores
        // 3. MANAGER - can exit their location
        const authorizedUsers = await prisma.user.findMany({
            where: {
                pin: { not: null },
                OR: [
                    // PROVIDER can exit anywhere
                    { role: 'PROVIDER' },
                    // Owner of this franchise
                    {
                        role: { in: ['OWNER', 'FRANCHISOR'] },
                        franchiseId: currentUser.franchiseId
                    },
                    // Manager at this location or franchise
                    {
                        role: 'MANAGER',
                        OR: [
                            { franchiseId: currentUser.franchiseId },
                            { locationId: currentUser.locationId }
                        ]
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                pin: true
            }
        })

        if (authorizedUsers.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No authorized users found. Contact support.'
            }, { status: 403 })
        }

        // Try to match PIN
        for (const user of authorizedUsers) {
            if (user.pin) {
                const isValid = await bcrypt.compare(pin, user.pin)
                if (isValid) {
                    // Log this access for security
                    console.log(`[KIOSK EXIT] User ${user.email} (${user.role}) exited kiosk mode`)

                    return NextResponse.json({
                        success: true,
                        message: 'PIN verified',
                        user: {
                            id: user.id,
                            name: user.name,
                            role: user.role
                        }
                    })
                }
            }
        }

        // No match
        return NextResponse.json({
            success: false,
            error: 'Invalid PIN. Use owner, manager, or support PIN.'
        }, { status: 401 })

    } catch (error) {
        console.error('PIN verification error:', error)
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
    }
}

