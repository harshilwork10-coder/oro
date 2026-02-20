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
            userEmail = mobileUser.email
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

        // Get user with their location
        const user = await prisma.user.findUnique({
            where: userId ? { id: userId } : { email: userEmail! },
            include: {
                location: true
            }
        })

        if (!user?.location) {
            console.error('[PAX Settings] User has no location:', userEmail || userId)
            return NextResponse.json({
                error: 'No location assigned',
                paxTerminalIP: null,
                paxTerminalPort: '10009'
            })
        }

        console.error('[PAX Settings] Location:', user.location.name, 'PAX IP:', user.location.paxTerminalIP)

        return NextResponse.json({
            paxTerminalIP: user.location.paxTerminalIP,
            paxTerminalPort: user.location.paxTerminalPort || '10009',
            processorMID: user.location.processorMID,
            locationName: user.location.name
        })
    } catch (error) {
        console.error('Error fetching PAX settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
}

