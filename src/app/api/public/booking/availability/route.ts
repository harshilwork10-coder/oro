import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get available time slots
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')
        const date = searchParams.get('date')
        const serviceId = searchParams.get('serviceId')
        const staffId = searchParams.get('staffId')

        if (!locationId || !date) {
            return NextResponse.json({ error: 'Location and date required' }, { status: 400 })
        }

        // Get service duration
        let duration = 30 // default
        if (serviceId) {
            const service = await prisma.service.findUnique({
                where: { id: serviceId },
                select: { duration: true }
            })
            if (service) duration = service.duration
        }

        // Parse date as local date (YYYY-MM-DD format)
        const [y, m, d] = date.split('-').map(Number)
        const dateStart = new Date(y, m - 1, d, 0, 0, 0, 0)
        const dateEnd = new Date(y, m - 1, d, 23, 59, 59, 999)

        const appointments = await prisma.appointment.findMany({
            where: {
                locationId,
                startTime: { gte: dateStart, lte: dateEnd },
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
                ...(staffId ? { employeeId: staffId } : {})
            },
            select: {
                startTime: true,
                endTime: true,
                employeeId: true
            }
        })

        // Get time blocks for the staff member (if specified)
        let timeBlocks: { startTime: Date; endTime: Date }[] = []
        if (staffId) {
            const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()

            const blocks = await prisma.timeBlock.findMany({
                where: {
                    userId: staffId,
                    OR: [
                        // One-time blocks on this date
                        {
                            isRecurring: false,
                            startTime: { gte: dateStart, lte: dateEnd }
                        },
                        // Recurring blocks (check day of week)
                        {
                            isRecurring: true
                        }
                    ]
                },
                select: {
                    startTime: true,
                    endTime: true,
                    isRecurring: true,
                    recurringDays: true,
                    recurringUntil: true
                }
            })

            timeBlocks = blocks.filter(block => {
                if (!block.isRecurring) {
                    return true // One-time block, already filtered by date
                }

                // Check if recurring block applies to this day
                if (block.recurringUntil && new Date(date) > block.recurringUntil) {
                    return false // Recurring ended
                }

                if (block.recurringDays) {
                    try {
                        const days = JSON.parse(block.recurringDays) as string[]
                        if (!days.includes(dayOfWeek)) {
                            return false // Doesn't apply to this day
                        }
                    } catch {
                        return false
                    }
                }

                return true
            }).map(block => {
                if (block.isRecurring) {
                    // Adjust recurring block time to this date
                    const blockStart = new Date(block.startTime)
                    const blockEnd = new Date(block.endTime)
                    const adjustedStart = new Date(date)
                    adjustedStart.setHours(blockStart.getHours(), blockStart.getMinutes(), 0, 0)
                    const adjustedEnd = new Date(date)
                    adjustedEnd.setHours(blockEnd.getHours(), blockEnd.getMinutes(), 0, 0)
                    return { startTime: adjustedStart, endTime: adjustedEnd }
                }
                return { startTime: new Date(block.startTime), endTime: new Date(block.endTime) }
            })
        }

        // Generate available slots (9 AM - 6 PM)
        const slots: { time: string; available: boolean }[] = []
        const startHour = 9
        const endHour = 18

        // Parse the date string to get year, month, day in local context
        const [year, month, day] = date.split('-').map(Number)

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                // Create slot time explicitly in local timezone
                const slotTime = new Date(year, month - 1, day, hour, minute, 0, 0)

                // Check if slot is in the past
                if (slotTime < new Date()) {
                    continue
                }

                const slotEnd = new Date(slotTime.getTime() + duration * 60000)

                // Check if slot conflicts with existing appointments
                const isAppointmentConflict = appointments.some(apt => {
                    const aptStart = new Date(apt.startTime)
                    const aptEnd = new Date(apt.endTime)
                    return (slotTime < aptEnd && slotEnd > aptStart)
                })

                // Check if slot conflicts with time blocks
                const isBlockConflict = timeBlocks.some(block => {
                    return (slotTime < block.endTime && slotEnd > block.startTime)
                })

                slots.push({
                    time: slotTime.toISOString(),
                    available: !isAppointmentConflict && !isBlockConflict
                })
            }
        }

        return NextResponse.json({ slots, duration })
    } catch (error) {
        console.error('Error fetching availability:', error)
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }
}

