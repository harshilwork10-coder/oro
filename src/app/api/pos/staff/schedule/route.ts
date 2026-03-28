/**
 * Stylist Schedule API
 * GET /api/pos/staff/schedule
 * 
 * Returns staff schedules for a date range.
 * Used by Android to show stylist availability grid.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date') // YYYY-MM-DD
    const rangeParam = url.searchParams.get('range') || 'week' // 'day' | 'week'

    try {
        // Get locations for this franchise
        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        // Calculate date range
        const baseDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date()
        baseDate.setHours(0, 0, 0, 0)
        
        const startDate = new Date(baseDate)
        const endDate = new Date(baseDate)
        
        if (rangeParam === 'week') {
            // Start from Sunday of the week
            startDate.setDate(startDate.getDate() - startDate.getDay())
            endDate.setDate(startDate.getDate() + 7)
        } else {
            endDate.setDate(endDate.getDate() + 1)
        }

        // Get schedules
        const schedules = await prisma.schedule.findMany({
            where: {
                locationId: { in: locationIds },
                date: {
                    gte: startDate,
                    lt: endDate
                }
            },
            include: {
                employee: {
                    select: { id: true, name: true, image: true }
                }
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
        })

        // Get all staff for this franchise (to show who's NOT scheduled too)
        const allStaff = await prisma.user.findMany({
            where: {
                franchiseId: user.franchiseId,
                role: { in: ['EMPLOYEE', 'MANAGER'] },
                isActive: true
            },
            select: { id: true, name: true, image: true }
        })

        // Get appointment counts per stylist per day
        const appointments = await prisma.appointment.findMany({
            where: {
                locationId: { in: locationIds },
                startTime: { gte: startDate, lt: endDate },
                status: { notIn: ['CANCELLED', 'NO_SHOW'] }
            },
            select: {
                employeeId: true,
                startTime: true
            }
        })

        // Build appointment count map: employeeId -> date -> count
        const apptCounts: Record<string, Record<string, number>> = {}
        appointments.forEach(apt => {
            if (!apt.employeeId) return
            const dateKey = apt.startTime.toISOString().split('T')[0]
            if (!apptCounts[apt.employeeId]) apptCounts[apt.employeeId] = {}
            apptCounts[apt.employeeId][dateKey] = (apptCounts[apt.employeeId][dateKey] || 0) + 1
        })

        // Format schedules grouped by employee
        const staffSchedules = allStaff.map(staff => ({
            id: staff.id,
            name: staff.name,
            avatar: staff.image,
            shifts: schedules
                .filter(s => s.employeeId === staff.id)
                .map(s => ({
                    date: s.date.toISOString().split('T')[0],
                    startTime: s.startTime.toISOString(),
                    endTime: s.endTime.toISOString(),
                    startHour: s.startTime.getHours() + s.startTime.getMinutes() / 60,
                    endHour: s.endTime.getHours() + s.endTime.getMinutes() / 60,
                    appointments: apptCounts[staff.id]?.[s.date.toISOString().split('T')[0]] || 0
                }))
        }))

        return NextResponse.json({
            success: true,
            data: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                range: rangeParam,
                staff: staffSchedules
            }
        })
    } catch (error) {
        console.error('[STAFF_SCHEDULE_ERROR]', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to load staff schedule'
        }, { status: 500 })
    }
}
