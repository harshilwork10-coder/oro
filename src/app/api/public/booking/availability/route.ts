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

        // Fetch location with booking profile for rules and real operating hours
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: {
                operatingHours: true,
                storeHours: true,
                timezone: true,
                bookingProfile: {
                    select: {
                        isPublished: true,
                        slotIntervalMin: true,
                        bufferMinutes: true,
                        maxAdvanceDays: true,
                        minNoticeMinutes: true
                    }
                }
            }
        })

        // Get booking rules from profile (or defaults)
        const slotInterval = location?.bookingProfile?.slotIntervalMin || 30
        const bufferMinutes = location?.bookingProfile?.bufferMinutes || 0
        const maxAdvanceDays = location?.bookingProfile?.maxAdvanceDays || 30
        const minNoticeMinutes = location?.bookingProfile?.minNoticeMinutes || 0

        // Parse operating hours from Location — use operatingHours first, fallback to storeHours
        const hoursJson = location?.operatingHours || location?.storeHours
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        const [y, m, d] = date.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)
        const dayOfWeek = dayNames[dateObj.getDay()]

        let startHour = 9
        let startMinute = 0
        let endHour = 18
        let endMinute = 0

        if (hoursJson) {
            try {
                const hours = JSON.parse(hoursJson)
                // Support both formats:
                // Format A: { "mon": "9:00-21:00" }
                // Format B: { "monday": { "open": "09:00", "close": "22:00" } }
                const dayKey = Object.keys(hours).find(k =>
                    k.toLowerCase().startsWith(dayOfWeek) ||
                    k.toLowerCase() === dayOfWeek
                )
                if (dayKey) {
                    const dayVal = hours[dayKey]
                    if (typeof dayVal === 'string') {
                        // Format A: "9:00-21:00"
                        if (dayVal.toLowerCase() === 'closed') {
                            return NextResponse.json({ slots: [], duration, closed: true })
                        }
                        const [openStr, closeStr] = dayVal.split('-')
                        const [oh, om] = openStr.split(':').map(Number)
                        const [ch, cm] = closeStr.split(':').map(Number)
                        startHour = oh; startMinute = om || 0
                        endHour = ch; endMinute = cm || 0
                    } else if (typeof dayVal === 'object' && dayVal.open) {
                        // Format B: { open: "09:00", close: "22:00" }
                        if (dayVal.closed === true) {
                            return NextResponse.json({ slots: [], duration, closed: true })
                        }
                        const [oh, om] = dayVal.open.split(':').map(Number)
                        const [ch, cm] = dayVal.close.split(':').map(Number)
                        startHour = oh; startMinute = om || 0
                        endHour = ch; endMinute = cm || 0
                    }
                }
            } catch { /* use defaults 9-18 */ }
        }

        // Parse date as local date (YYYY-MM-DD format)
        const dateStart = new Date(y, m - 1, d, 0, 0, 0, 0)
        const dateEnd = new Date(y, m - 1, d, 23, 59, 59, 999)

        // Check max advance days
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const requestedDate = new Date(y, m - 1, d)
        const daysDiff = Math.floor((requestedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff > maxAdvanceDays) {
            return NextResponse.json({ slots: [], duration, message: 'Date is too far in advance' })
        }

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
            const dayOfWeekStr = new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()

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
                        if (!days.includes(dayOfWeekStr)) {
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

        const slots: { time: string; available: boolean }[] = []
        const now = new Date()

        // Generate slots using real operating hours and booking profile rules
        for (let hour = startHour; hour < endHour || (hour === endHour && 0 < endMinute); hour++) {
            for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += slotInterval) {
                // Don't exceed business close time
                if (hour > endHour || (hour === endHour && minute >= endMinute)) break

                // Create slot time explicitly in local timezone
                const slotTime = new Date(y, m - 1, d, hour, minute, 0, 0)

                // Check if slot is in the past
                if (slotTime < now) {
                    continue
                }

                // Check minimum notice period
                const minutesUntilSlot = (slotTime.getTime() - now.getTime()) / 60000
                if (minutesUntilSlot < minNoticeMinutes) {
                    continue
                }

                const slotEnd = new Date(slotTime.getTime() + (duration + bufferMinutes) * 60000)

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
