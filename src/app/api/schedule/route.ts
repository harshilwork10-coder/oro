import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET schedules for a week with standardized responses
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return ApiResponse.unauthorized()
        }

        const searchParams = request.nextUrl.searchParams
        const weekStart = searchParams.get('weekStart')
        const locationId = searchParams.get('locationId')
        const employeeId = searchParams.get('employeeId')

        if (!weekStart) {
            return ApiResponse.validationError('weekStart is required')
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

        const user = session.user as { id: string; role: string; franchiseId?: string }

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

        return ApiResponse.success(schedules)
    } catch (error) {
        console.error('Error fetching schedules:', error)
        return ApiResponse.serverError('Failed to fetch schedules')
    }
}

// POST - Create new schedule entry
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as { id: string; role: string; franchiseId?: string }

        if (!user?.id) {
            return ApiResponse.unauthorized()
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return ApiResponse.forbidden('Insufficient permissions')
        }

        const body = await request.json()
        const { employeeId, locationId, date, startTime, endTime } = body

        if (!employeeId || !locationId || !date || !startTime || !endTime) {
            return ApiResponse.validationError('All fields are required')
        }

        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: {
                franchiseId: true,
                franchise: { select: { franchisorId: true } }
            }
        })

        if (!location) {
            return ApiResponse.notFound('Location')
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
            return ApiResponse.forbidden()
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

        return ApiResponse.created(schedule)
    } catch (error) {
        console.error('Error creating schedule:', error)
        return ApiResponse.serverError('Failed to create schedule')
    }
}

// DELETE - Delete schedule entry
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as { id: string; role: string; franchiseId?: string }

        if (!user?.id) {
            return ApiResponse.unauthorized()
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(user.role)) {
            return ApiResponse.forbidden('Insufficient permissions')
        }

        const searchParams = request.nextUrl.searchParams
        const id = searchParams.get('id')

        if (!id) {
            return ApiResponse.validationError('Schedule ID is required')
        }

        const schedule = await prisma.schedule.findUnique({
            where: { id },
            include: { location: { select: { franchiseId: true } } }
        })

        if (!schedule) {
            return ApiResponse.notFound('Schedule')
        }

        if (schedule.location.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return ApiResponse.forbidden()
        }

        await prisma.schedule.delete({ where: { id } })

        return ApiResponse.success({ deleted: true })
    } catch (error) {
        console.error('Error deleting schedule:', error)
        return ApiResponse.serverError('Failed to delete schedule')
    }
}
