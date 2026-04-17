import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Get PAX settings for current user's location
// Supports both Web (session) and Android (getAuthUser) authentication
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        let userId: string | null = null
        let userEmail: string | null = null

        // Try Android mobile auth first (Authorization header)
        if (authUser) {
            userId = authUser.id
            userEmail = authUser.email ?? null
            console.error('[PAX Settings] Auth success:', userEmail)
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

