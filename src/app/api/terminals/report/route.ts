import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// API for POS to report terminal connection status
// This gets called when POS successfully connects to PAX terminal
// Stores the IP so Provider can see it in their admin panel

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { terminalIP, terminalPort, status, mid } = await request.json()

        if (!user.locationId) {
            // Try to get location from user record
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                include: { location: true, franchise: { include: { locations: { take: 1 } } } }
            })
            const locationId = userData?.locationId || userData?.franchise?.locations?.[0]?.id
            if (!locationId) {
                return NextResponse.json({ error: 'No location assigned' }, { status: 400 })
            }

            // Update the location with terminal info
            await prisma.location.update({
                where: { id: locationId },
                data: {
                    paxTerminalIP: terminalIP || null,
                    paxTerminalPort: terminalPort || '10009',
                    processorMID: mid || null,
                    // Using custom field to track last connection
                }
            })

            return NextResponse.json({ success: true, locationId })
        }

        // Update location with terminal connection info
        await prisma.location.update({
            where: { id: user.locationId },
            data: {
                paxTerminalIP: terminalIP || null,
                paxTerminalPort: terminalPort || '10009',
                processorMID: mid || null,
            }
        })

        return NextResponse.json({ success: true, locationId: user.locationId })
    } catch (error) {
        console.error('[TERMINAL_REPORT]', error)
        return NextResponse.json({ error: 'Failed to report terminal' }, { status: 500 })
    }
}

// GET - Provider can fetch terminal status for a specific location
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Provider only' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
        }

        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: {
                id: true,
                name: true,
                paxTerminalIP: true,
                paxTerminalPort: true,
                processorMID: true,
                updatedAt: true,
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Try to ping the terminal to check if it's online
        let isOnline = false
        if (location.paxTerminalIP) {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 3000)

                const response = await fetch(`http://${location.paxTerminalIP}:${location.paxTerminalPort || '10009'}/PaxResponse`, {
                    method: 'GET',
                    signal: controller.signal
                }).catch(() => null)

                clearTimeout(timeoutId)
                isOnline = response?.ok || false
            } catch {
                isOnline = false
            }
        }

        return NextResponse.json({
            ...location,
            isOnline,
            lastUpdated: location.updatedAt
        })
    } catch (error) {
        console.error('[TERMINAL_STATUS]', error)
        return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
    }
}

