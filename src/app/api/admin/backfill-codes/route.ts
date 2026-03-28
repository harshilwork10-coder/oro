import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { generateStoreCode, generateStationCode } from '@/lib/codeGenerator'
import { logActivity } from '@/lib/auditLog'

/**
 * POST /api/admin/backfill-codes
 * Backfill codes for existing locations and stations
 * Uses raw SQL to bypass Prisma type issues
 * Provider only
 * 
 * Query params:
 * - force=true: Regenerate ALL codes, not just missing ones
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const force = searchParams.get('force') === 'true'

        // Use raw SQL to get all locations with pulseStoreCode
        const allLocations = await prisma.$queryRaw<Array<{ id: string, name: string, pulseStoreCode: string | null }>>`
            SELECT id, name, pulseStoreCode FROM Location
        `
        const allStations = await prisma.$queryRaw<Array<{ id: string, name: string, pairingCode: string | null, locationId: string }>>`
            SELECT id, name, pairingCode, locationId FROM Station
        `

        const existingStoreCodes: string[] = []
        const existingStationCodes: string[] = []

        let locationsUpdated = 0
        let stationsUpdated = 0

        // Backfill locations
        for (const location of allLocations) {
            // Update if force=true OR code is missing
            if (force || !location.pulseStoreCode) {
                const newCode = generateStoreCode(location.name, existingStoreCodes)
                existingStoreCodes.push(newCode)

                await prisma.$executeRaw`
                    UPDATE Location SET pulseStoreCode = ${newCode} WHERE id = ${location.id}
                `
                locationsUpdated++
            } else {
                existingStoreCodes.push(location.pulseStoreCode)
            }
        }

        // Backfill stations
        const stationsByLocation = new Map<string, typeof allStations>()
        for (const station of allStations) {
            const list = stationsByLocation.get(station.locationId) || []
            list.push(station)
            stationsByLocation.set(station.locationId, list)
        }

        for (const [locationId, stations] of stationsByLocation) {
            let stationNumber = 1
            for (const station of stations) {
                if (force || !station.pairingCode) {
                    const newCode = generateStationCode(stationNumber, existingStationCodes)
                    existingStationCodes.push(newCode)

                    await prisma.$executeRaw`
                        UPDATE Station SET pairingCode = ${newCode} WHERE id = ${station.id}
                    `
                    stationsUpdated++
                } else {
                    existingStationCodes.push(station.pairingCode)
                }
                stationNumber++
            }
        }

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: 'PROVIDER',
            action: 'CODES_BACKFILLED',
            entityType: 'System',
            entityId: 'bulk',
            metadata: { force, locationsUpdated, stationsUpdated }
        })

        return NextResponse.json({
            success: true,
            force,
            locationsUpdated,
            stationsUpdated,
            totalLocations: allLocations.length,
            totalStations: allStations.length,
            message: force
                ? `Regenerated ALL codes: ${locationsUpdated} locations and ${stationsUpdated} stations`
                : `Updated ${locationsUpdated} locations and ${stationsUpdated} stations with new codes`
        })

    } catch (error) {
        console.error('Error backfilling codes:', error)
        return NextResponse.json(
            { error: 'Failed to backfill codes', details: String(error) },
            { status: 500 }
        )
    }
}

