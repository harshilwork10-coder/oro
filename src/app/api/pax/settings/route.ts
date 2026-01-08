import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get PAX settings for current user's location
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user with their location
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                location: true
            }
        })

        if (!user?.location) {
            return NextResponse.json({
                error: 'No location assigned',
                paxTerminalIP: null,
                paxTerminalPort: '10009'
            })
        }

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

