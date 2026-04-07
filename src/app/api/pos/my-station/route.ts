import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Returns the current user's assigned station (set by Owner)
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user with their assigned station
        const userData = await prisma.user.findUnique({
            where: { id: authUser.id },
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
            },
            theme: {
                themeId: station.location.themeId || 'classic_oro',
                highContrast: station.location.highContrast || false
            }
        })
    } catch (error: any) {
        console.error('[POS_MY_STATION]', error?.message?.slice(0, 120))
        return NextResponse.json({ station: null, message: 'Failed to load station' })
    }
}
