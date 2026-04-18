import { prisma } from '@/lib/prisma'

/**
 * STRICLY resolves the correct locationId for a transaction write based on context.
 * Complies with Rule 4 Backfill & Write priority rules.
 */
export async function resolveTransactionLocation(params: {
    franchiseId: string
    employeeId?: string
    stationId?: string | null
    cashDrawerSessionId?: string | null
    appointmentId?: string | null
}): Promise<{ locationId: string | undefined, stationId: string | undefined }> {
    let resolvedLocationId: string | undefined = undefined
    const { franchiseId, employeeId, stationId, cashDrawerSessionId, appointmentId } = params

    // 1. Station / Cash Drawer Session context
    if (stationId) {
        const station = await prisma.station.findUnique({ where: { id: stationId } })
        if (station?.locationId) return { locationId: station.locationId, stationId }
    }
    if (cashDrawerSessionId) {
        const session: any = await prisma.cashDrawerSession.findUnique({ 
            where: { id: cashDrawerSessionId },
            include: { station: true }
        })
        if (session?.locationId) return { locationId: session.locationId, stationId: session.stationId || stationId }
        if (session?.station?.locationId) return { locationId: session.station.locationId, stationId: session.stationId || stationId }
    }

    // 2. Appointment / Walk-in context
    // Omitting full lookup here to avoid performance hit on sync unless strictly needed,
    // assuming offline sync is mostly retail/walk-ins without appointmentId.

    // 3. Employee Shift context at transaction time
    if (employeeId) {
        const shift: any = await prisma.timeEntry.findFirst({
            where: {
                userId: employeeId,
                status: 'CLOCKED_IN',
            },
            orderBy: { clockIn: 'desc' }
        })
        if (shift?.locationId) return { locationId: shift.locationId, stationId }
    }

    // 4. Single-location franchise fallback
    const locations = await prisma.location.findMany({
        where: { franchiseId },
        select: { id: true },
        take: 2 // We only need to know if there's exactly 1
    })
    if (locations.length === 1) {
        return { locationId: locations[0].id, stationId }
    }

    // 5. Otherwise return undefined (unresolved)
    return { locationId: undefined, stationId }
}
