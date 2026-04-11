import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Fetch employee's availability from Schedule model
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const schedules = await prisma.schedule.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                dayOfWeek: true,
                startTime: true,
                endTime: true,
                isAvailable: true
            }
        })

        return NextResponse.json({ availability: schedules })
    } catch (error) {
        console.error('[EMPLOYEE_AVAILABILITY]', error)
        return NextResponse.json({ availability: [] })
    }
}

// POST - Update employee's availability via Schedule model
export async function POST(req: NextRequest) {
    try {
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { dayOfWeek, startTime, endTime, isAvailable } = body

        const schedule = await prisma.schedule.upsert({
            where: {
                userId_dayOfWeek: { userId: user.id, dayOfWeek }
            },
            update: { startTime, endTime, isAvailable },
            create: {
                userId: user.id,
                dayOfWeek,
                startTime,
                endTime,
                isAvailable: isAvailable ?? true
            }
        })

        return NextResponse.json({ success: true, schedule })
    } catch (error) {
        console.error('[EMPLOYEE_AVAILABILITY_UPDATE]', error)
        return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }
}
