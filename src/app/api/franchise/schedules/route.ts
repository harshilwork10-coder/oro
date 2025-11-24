import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId')

    const where: any = {
        franchiseId: user.franchiseId,
    }

    if (startDate && endDate) {
        where.startTime = {
            gte: new Date(startDate),
            lte: new Date(endDate)
        }
    }

    if (employeeId) {
        where.employeeId = employeeId
    }

    try {
        const schedules = await prisma.schedule.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            },
            orderBy: { startTime: 'asc' }
        })

        return NextResponse.json(schedules)
    } catch (error) {
        console.error('Error fetching schedules:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { employeeId, date, startTime, endTime, notes } = body

        if (!employeeId || !date || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Combine date and time
        const startDateTime = new Date(`${date}T${startTime}`)
        const endDateTime = new Date(`${date}T${endTime}`)

        // Validation: End time must be after start time
        if (endDateTime <= startDateTime) {
            return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
        }

        const schedule = await prisma.schedule.create({
            data: {
                franchiseId: user.franchiseId,
                employeeId,
                startTime: startDateTime,
                endTime: endDateTime,
                notes
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        return NextResponse.json(schedule)
    } catch (error) {
        console.error('Error creating schedule:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
