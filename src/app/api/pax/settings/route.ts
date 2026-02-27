import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/mobileAuth'

// GET - Get PAX settings for current user's location
// Supports both Web (session) and Android (getAuthUser) authentication
export async function GET(request: NextRequest) {
    try {
        let userId: string | null = null
        let userEmail: string | null = null

        // Try Android mobile auth first (Authorization header)
        const mobileUser = await getAuthUser(request)
        if (mobileUser) {
            userId = mobileUser.id
            userEmail = mobileUser.email ?? null
            console.error('[PAX Settings] Mobile auth:', mobileUser.email)
        } else {
            // Fall back to web session auth
            const session = await getServerSession(authOptions)
            if (session?.user?.email) {
                userEmail = session.user.email
                console.error('[PAX Settings] Session auth:', session.user.email)
            }
        }

        if (!userId && !userEmail) {
            console.error('[PAX Settings] No auth found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user with their locationId
        const user = await prisma.user.findUnique({
            where: userId ? { id: userId } : { email: userEmail! },
            select: { id: true, locationId: true }
        })

        if (!user?.locationId) {
            console.error('[PAX Settings] User has no location:', userEmail || userId)
            return NextResponse.json({
                error: 'No location assigned',
                paxTerminalIP: null,
                paxTerminalPort: '10009'
            })
        }

        const location = await prisma.location.findUnique({
            where: { id: user.locationId },
            select: { name: true, paxTerminalIP: true, paxTerminalPort: true, processorMID: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        console.error('[PAX Settings] Location:', location.name, 'PAX IP:', location.paxTerminalIP)

        return NextResponse.json({
            paxTerminalIP: location.paxTerminalIP,
            paxTerminalPort: location.paxTerminalPort || '10009',
            processorMID: location.processorMID,
            locationName: location.name
        })
    } catch (error) {
        console.error('Error fetching PAX settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

