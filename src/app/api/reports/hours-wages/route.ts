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

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const startDateTime = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        startDateTime.setHours(0, 0, 0, 0)
        const endDateTime = endDate ? new Date(endDate) : new Date()
        endDateTime.setHours(23, 59, 59, 999)

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true, locationId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ entries: [] })
        }

        // Get time entries
        const timeEntries = await prisma.timeEntry.findMany({
            where: {
                clockIn: { gte: startDateTime, lte: endDateTime },
                location: { franchiseId: user.franchiseId }
            },
            include: {
                user: { select: { name: true } }
            },
            orderBy: { clockIn: 'desc' }
        })

        const entries = timeEntries.map(entry => {
            const clockIn = new Date(entry.clockIn)
            const clockOut = entry.clockOut ? new Date(entry.clockOut) : null
            const hoursWorked = clockOut
                ? (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) - (entry.breakDuration / 60)
                : 0

            return {
                id: entry.id,
                employeeName: entry.user.name || 'Unknown',
                date: clockIn.toLocaleDateString('en-US'),
                clockIn: clockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                clockOut: clockOut ? clockOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
                hoursWorked: Math.max(0, hoursWorked),
                breakMinutes: entry.breakDuration
            }
        })

        return NextResponse.json({ entries })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
