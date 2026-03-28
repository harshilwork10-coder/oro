import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// GET schedules for a week with standardized responses
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = req.nextUrl.searchParams
        const weekStart = searchParams.get('weekStart')
        const locationId = searchParams.get('locationId')
        const employeeId = searchParams.get('employeeId')

        if (!weekStart) {
            return NextResponse.json({ error: 'weekStart is required' }, { status: 422 })
        }

        const startDate = new Date(weekStart)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 7)

        // Build where clause based on role
        const whereClause: Record<string, unknown> = {
            date: {
                gte: startDate,
                lt: endDate
            }
        }

        if (locationId) {
            whereClause.locationId = locationId
        }

        if (employeeId) {
            whereClause.employeeId = employeeId
        }
        // For employees, only show their own schedule
        if (user.role === 'EMPLOYEE') {
            whereClause.employeeId = user.id
        } else if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                select: {
                    franchises: {
                        select: {
                            locations: { select: { id: true } }
                        }
                    }
                }
            })
            const locationIds = franchisor?.franchises.flatMap(f => f.locations.map(l => l.id)) || []
            whereClause.locationId = { in: locationIds }
        } else if (user.role === 'FRANCHISEE' || user.role === 'MANAGER') {
            if (user.franchiseId) {
                const franchiseLocations = await prisma.location.findMany({
                    where: { franchiseId: user.franchiseId },
                    select: { id: true }
                })
                whereClause.locationId = { in: franchiseLocations.map(l => l.id) }
            }
        }

        const schedules = await prisma.schedule.findMany({
            where: whereClause,
            include: {
                employee: {
                    select: { id: true, name: true, email: true }
                },
                location: {
                    select: { id: true, name: true }
                }
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        })

        return NextResponse.json(schedules)
    } catch (error) {
        console.error('Error fetching schedules:', error)
        return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }
}

// POST - Create new schedule entry
export async function POST(req: NextRequest) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const body = await req.json()
        const { employeeId, locationId, date, startTime, endTime } = body

        if (!employeeId || !locationId || !date || !startTime || !endTime) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 422 })
        }

        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: {
                franchiseId: true,
                franchise: { select: { franchisorId: true } }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location' }, { status: 404 })
        }

        // Check access based on role
        let hasAccess = false
        if (user.role === 'PROVIDER') {
            hasAccess = true
        } else if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                select: { id: true }
            })
            hasAccess = franchisor ? location.franchise?.franchisorId === franchisor.id : false
        } else {
            hasAccess = location.franchiseId === user.franchiseId
        }

        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const schedule = await prisma.schedule.create({
            data: {
                employeeId,
                locationId,
                date: new Date(date),
                startTime: new Date(startTime),
                endTime: new Date(endTime)
            },
            include: {
                employee: { select: { id: true, name: true, email: true } },
                location: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json(schedule, { status: 201 })
    } catch (error) {
        console.error('Error creating schedule:', error)
        return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
    }
}

// DELETE - Delete schedule entry
export async function DELETE(req: NextRequest) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const searchParams = req.nextUrl.searchParams
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Schedule ID is required' }, { status: 422 })
        }

        const schedule = await prisma.schedule.findUnique({
            where: { id },
            include: { location: { select: { franchiseId: true } } }
        })

        if (!schedule) {
            return NextResponse.json({ error: 'Schedule' }, { status: 404 })
        }

        if (schedule.location.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        await prisma.schedule.delete({ where: { id } })

        return NextResponse.json({ deleted: true })
    } catch (error) {
        console.error('Error deleting schedule:', error)
        return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
    }
}
