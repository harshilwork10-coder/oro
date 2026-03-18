import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch timeclock shift history for the current employee
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const shifts = await prisma.timeClock.findMany({
            where: {
                ...(user.locationId ? { locationId: user.locationId } : {}),
                ...(user.franchiseId ? { franchiseId: user.franchiseId } : {})
            },
            orderBy: { clockIn: 'desc' },
            take: 20,
            include: {
                employee: { select: { firstName: true, lastName: true } }
            }
        })

        const data = shifts.map(shift => ({
            id: shift.id,
            clockIn: shift.clockIn,
            clockOut: shift.clockOut,
            employeeName: shift.employee
                ? `${shift.employee.firstName} ${shift.employee.lastName}`
                : 'Unknown'
        }))

        return NextResponse.json({ data })
    } catch (error) {
        console.error('[TIMECLOCK_HISTORY]', error)
        return NextResponse.json({ data: [] })
    }
}
