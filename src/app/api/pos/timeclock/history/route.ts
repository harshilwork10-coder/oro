import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Fetch timeclock shift history for the current employee
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const shifts = await prisma.timeEntry.findMany({
            where: {
                ...(user.locationId ? { locationId: user.locationId } : {}),
                // Scope to user's own entries unless manager/owner
                ...(!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)
                    ? { userId: user.id } : {}),
            },
            orderBy: { clockIn: 'desc' },
            take: 20,
            include: {
                user: { select: { name: true } }
            }
        })

        const data = shifts.map((shift: any) => ({
            id: shift.id,
            clockIn: shift.clockIn,
            clockOut: shift.clockOut,
            employeeName: shift.user?.name || 'Unknown'
        }))

        return NextResponse.json({ data })
    } catch (error) {
        console.error('[TIMECLOCK_HISTORY]', error)
        return NextResponse.json({ error: 'Failed to fetch timeclock history' }, { status: 500 })
    }
}
