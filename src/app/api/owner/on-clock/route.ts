import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/owner/on-clock - Employees currently clocked in
// Supports: ?locationId=xxx
export async function GET(req: Request) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')

        // Build location filter
        const locationFilter: any = {}
        if (locationId) {
            locationFilter.locationId = locationId
        } else {
            // Get all locations for this franchise
            const locations = await prisma.location.findMany({
                where: { franchiseId: user.franchiseId },
                select: { id: true }
            })
            locationFilter.locationId = { in: locations.map(l => l.id) }
        }

        // Find open time entries (currently clocked in)
        const onClock = await prisma.timeEntry.findMany({
            where: {
                ...locationFilter,
                status: 'OPEN',
                clockOut: null
            },
            include: {
                user: { select: { id: true, name: true, role: true } },
                location: { select: { id: true, name: true } }
            },
            orderBy: { clockIn: 'asc' }
        })

        const employees = onClock.map(entry => {
            const now = new Date()
            const clockedInAt = new Date(entry.clockIn)
            const hoursWorked = (now.getTime() - clockedInAt.getTime()) / (1000 * 60 * 60)

            return {
                id: entry.user.id,
                name: entry.user.name,
                role: entry.user.role,
                clockedInAt: entry.clockIn,
                hoursWorked: Math.round(hoursWorked * 10) / 10,
                locationName: entry.location.name,
                locationId: entry.location.id,
                timeEntryId: entry.id
            }
        })

        return NextResponse.json({
            employees,
            totalOnClock: employees.length
        })
    } catch (error) {
        console.error('[ON_CLOCK]', error)
        return NextResponse.json({ error: 'Failed to fetch on-clock data' }, { status: 500 })
    }
}
