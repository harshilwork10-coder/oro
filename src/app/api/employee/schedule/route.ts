import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const authUser = await getAuthUser(request)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: authUser.email }
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    try {
        const now = new Date()

        const schedules = await prisma.schedule.findMany({
            where: {
                employeeId: user.id,
                startTime: {
                    gte: now
                }
            },
            orderBy: {
                startTime: 'asc'
            },
            take: 5 // Next 5 shifts
        })

        return NextResponse.json(schedules)
    } catch (error) {
        console.error('Error fetching employee schedule:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

