import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Called by POS when it discovers a terminal on its local network
// The POS scans locally and reports here - Provider then sees the IP
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { discoveredIP, discoveredPort, franchiseId, locationId } = await request.json()

        // Find the location to update
        let targetLocationId = locationId

        if (!targetLocationId) {
            // Try to get from user
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    location: true,
                    franchise: {
                        include: { locations: { take: 1 } }
                    }
                }
            })
            targetLocationId = userData?.locationId || userData?.franchise?.locations?.[0]?.id
        }

        if (!targetLocationId) {
            return NextResponse.json({ error: 'No location found' }, { status: 400 })
        }

        // Update the location with discovered terminal IP
        const updated = await prisma.location.update({
            where: { id: targetLocationId },
            data: {
                paxTerminalIP: discoveredIP,
                paxTerminalPort: discoveredPort || '10009',
            }
        })

        return NextResponse.json({
            success: true,
            message: `Terminal found! IP ${discoveredIP} saved.`,
            locationId: targetLocationId,
            ip: discoveredIP
        })
    } catch (error) {
        console.error('[TERMINAL_DISCOVER_SAVE]', error)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }
}
