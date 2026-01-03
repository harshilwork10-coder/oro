import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Returns the current user's assigned station (set by Owner)
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as { id: string }

    // Get user with their assigned station
    const userData = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            assignedStation: {
                include: {
                    dedicatedTerminal: true,
                    location: true
                }
            }
        }
    })

    if (!userData?.assignedStation) {
        return NextResponse.json({
            station: null,
            message: 'No station assigned. Owner must assign you to a station.'
        })
    }

    const station = userData.assignedStation
    return NextResponse.json({
        station: {
            id: station.id,
            name: station.name,
            paymentMode: station.paymentMode,
            pairingCode: station.pairingCode,
            locationName: station.location.name,
            dedicatedTerminal: station.dedicatedTerminal ? {
                id: station.dedicatedTerminal.id,
                name: station.dedicatedTerminal.name,
                terminalIP: station.dedicatedTerminal.terminalIP,
                terminalPort: station.dedicatedTerminal.terminalPort,
                terminalType: station.dedicatedTerminal.terminalType
            } : null
        }
    })
}

