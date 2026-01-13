import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Assign or revoke Pulse seat for a user
// POST: { userId: string, action: 'assign' | 'revoke' }
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER or OWNER can manage seats
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, franchiseId: true }
        })

        if (!currentUser || !['PROVIDER', 'OWNER', 'FRANCHISOR'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { userId, action } = body

        if (!userId || !['assign', 'revoke'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        // Get target user
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
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

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const config = targetUser.franchise?.franchisor?.config

        if (action === 'assign') {
            // Check if business has Pulse enabled
            if (!config?.usesMobilePulse) {
                return NextResponse.json({
                    error: 'Oro 9 Pulse is not enabled for this business. Enable it first.',
                    code: 'PULSE_NOT_ENABLED'
                }, { status: 400 })
            }

            // Count current assigned seats
            const assignedCount = await prisma.user.count({
                where: {
                    franchise: {
                        franchisorId: targetUser.franchise?.franchisorId
                    },
                    hasPulseAccess: true
                }
            })

            // Check seat limit
            if (assignedCount >= (config.pulseSeatCount || 0)) {
                return NextResponse.json({
                    error: `All ${config.pulseSeatCount} Pulse seats are assigned. Purchase more seats to add users.`,
                    code: 'NO_SEATS_AVAILABLE',
                    assigned: assignedCount,
                    limit: config.pulseSeatCount
                }, { status: 400 })
            }

            // Assign seat
            await prisma.user.update({
                where: { id: userId },
                data: { hasPulseAccess: true }
            })

            return NextResponse.json({
                success: true,
                message: `Pulse access granted to ${targetUser.name || targetUser.email}`,
                seatsUsed: assignedCount + 1,
                seatsTotal: config.pulseSeatCount
            })

        } else if (action === 'revoke') {
            // Revoke seat
            await prisma.user.update({
                where: { id: userId },
                data: { hasPulseAccess: false }
            })

            return NextResponse.json({
                success: true,
                message: `Pulse access revoked from ${targetUser.name || targetUser.email}`
            })
        }

    } catch (error) {
        console.error('Error managing Pulse seat:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// Get seat usage for a business
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const franchisorId = searchParams.get('franchisorId')

        if (!franchisorId) {
            return NextResponse.json({ error: 'franchisorId required' }, { status: 400 })
        }

        // Get config
        const config = await prisma.businessConfig.findUnique({
            where: { franchisorId },
            select: {
                usesMobilePulse: true,
                pulseSeatCount: true
            }
        })

        // Get assigned users
        const assignedUsers = await prisma.user.findMany({
            where: {
                franchise: { franchisorId },
                hasPulseAccess: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        })

        return NextResponse.json({
            enabled: config?.usesMobilePulse || false,
            seatsTotal: config?.pulseSeatCount || 0,
            seatsUsed: assignedUsers.length,
            seatsAvailable: (config?.pulseSeatCount || 0) - assignedUsers.length,
            assignedUsers
        })

    } catch (error) {
        console.error('Error getting Pulse seats:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

