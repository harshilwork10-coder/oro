/**
 * Active Employees API
 * 
 * GET: Fetch list of employees currently clocked in at this location
 * Used for Quick Switch feature (Toast POS style)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const storeId = user.storeId || user.locationId

        if (!storeId) {
            return NextResponse.json({ error: 'No store context' }, { status: 400 })
        }

        // Find all employees with an active time entry (OPEN, no clockOut)
        const activeEntries = await prisma.timeEntry.findMany({
            where: {
                locationId: storeId,
                status: 'OPEN',
                clockOut: null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        role: true
                    }
                }
            },
            orderBy: {
                clockIn: 'desc'
            }
        })

        // Transform to employee list with clock-in info
        const employees = activeEntries.map(entry => ({
            id: entry.user.id,
            name: entry.user.name || 'Unknown',
            image: entry.user.image,
            role: entry.user.role,
            clockedInAt: entry.clockIn.toISOString()
        }))

        return NextResponse.json({ employees })
    } catch (error) {
        console.error('[Time Clock Active] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch active employees' }, { status: 500 })
    }
}
